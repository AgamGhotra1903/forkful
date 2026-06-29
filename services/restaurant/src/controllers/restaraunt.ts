import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";

export const addRestraunt = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const existingRestaunrant = await Restaurant.findOne({
    ownerId: user._id,
  });

  if (existingRestaunrant) {
    return res.status(400).json({
      message: "You already have a restaurant",
    });
  }

  const { name, description, latitude, longitude, formattedAddress, phone } =
    req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({
      message: "Please give all details",
    });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Please give image",
    });
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer?.content) {
    return res.status(500).json({
      message: "Failed to create file buffer",
    });
  }

  const { data: uploadResult } = await axios.post(
    `${process.env.UTILS_SERVICE}/api/upload`,
    { buffer: fileBuffer.content },
    { maxBodyLength: Infinity, maxContentLength: Infinity }
  );

  const restaurant = await Restaurant.create({
    name,
    description,
    phone,
    image: uploadResult.url,
    ownerId: user._id,
    autoLocation: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      formattedAddress,
    },
    isVerified: true,
  });

  return res.status(201).json({
    message: "Restaurant created successfully",
    restaurant,
  });
});

export const fetchMyRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please Login",
      });
    }
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

    if (!restaurant) {
      return res.status(400).json({
        message: "No Restaurant found",
      });
    }

    if (!req.user.restaurantId) {
      const token = jwt.sign(
        {
          user: {
            ...req.user,
            restaurantId: restaurant._id,
          },
        },
        process.env.JWT_SEC as string,
        {
          expiresIn: "15d",
        }
      );

      return res.json({ restaurant, token });
    }

    res.json({ restaurant });
  }
);

export const updateStatusRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    // FIXED BUG 2: accept both { status } (old API) and { isOpen } (frontend toggle call)
    const rawStatus = req.body.status ?? req.body.isOpen;

    if (typeof rawStatus !== "boolean") {
      return res.status(400).json({
        message: "Status must be boolean",
      });
    }

    const status = rawStatus;

    const restaurant = await Restaurant.findOneAndUpdate(
      {
        ownerId: req.user._id,
      },
      status ? { isOpen: status, isVerified: true } : { isOpen: status },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    res.json({
      message: "Restaurant status Updated",
      restaurant,
    });
  }
);

export const updateRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const { name, description, phone } = req.body;

    const updateFields: Record<string, any> = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (phone !== undefined) updateFields.phone = phone;

    // Handle optional image upload
    if (req.file) {
      const fileBuffer = getBuffer(req.file);
      if (fileBuffer?.content) {
        const { data: uploadResult } = await axios.post(
          `${process.env.UTILS_SERVICE}/api/upload`,
          { buffer: fileBuffer.content },
          { maxBodyLength: Infinity, maxContentLength: Infinity }
        );
        if (uploadResult?.url) {
          updateFields.image = uploadResult.url;
        }
      }
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { ownerId: req.user._id },
      updateFields,
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    res.json({
      message: "Restaurant Updated",
      restaurant,
    });
  }
);

// FIXED BUG (Customer feed distance filter): the previous default of
// 50,000,000 meters (50,000km) meant "radius" was effectively never
// enforced — every restaurant on Earth qualified unless the caller
// explicitly passed a smaller value, and the frontend never did.
// The product requirement is a strict 30km customer-feed radius, so we
// default + hard-cap to that here rather than trusting the caller.
const DEFAULT_FEED_RADIUS_METERS = 30000; // 30km
const MAX_FEED_RADIUS_METERS = 30000; // 30km hard ceiling — never serve farther than this

export const getNearbyRestaurant = TryCatch(async (req, res) => {
  const { latitude, longitude, radius, search = "" } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  // Parse the caller-supplied radius (if any), but always clamp it to the
  // 30km maximum so the feed can never accidentally show restaurants
  // outside that range — radius can only ever narrow the feed, not widen it.
  const requestedRadius = radius ? Number(radius) : DEFAULT_FEED_RADIUS_METERS;
  const safeRadius =
    Number.isFinite(requestedRadius) && requestedRadius > 0
      ? Math.min(requestedRadius, MAX_FEED_RADIUS_METERS)
      : DEFAULT_FEED_RADIUS_METERS;

  const query: any = { $or: [{ isVerified: true }, { isOpen: true }] };

  if (search && typeof search === "string") {
    const regex = { $regex: search, $options: "i" };
    query.$or = [
      { name: regex },
      { description: regex },
    ];
  }

  // When a search term is present we need to also match restaurants whose
  // menu items contain the term.  We do this with a $lookup + $match pipeline
  // stage so the geo-near result set is post-filtered by menu content.
  const menuMatchStage = search && typeof search === "string"
    ? [
        {
          $lookup: {
            from: "menuitems",
            localField: "_id",
            foreignField: "restaurantId",
            as: "menuItems",
          },
        },
        {
          $match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
              { "menuItems.name": { $regex: search, $options: "i" } },
              { "menuItems.category": { $regex: search, $options: "i" } },
            ],
          },
        },
      ]
    : [
        {
          $lookup: {
            from: "menuitems",
            localField: "_id",
            foreignField: "restaurantId",
            as: "menuItems",
          },
        },
      ];

  const restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
        distanceField: "distance",
        maxDistance: safeRadius,
        spherical: true,
        query: { $or: [{ isVerified: true }, { isOpen: true }] },
      },
    },
    {
      $sort: {
        isOpen: -1,
        distance: 1,
      },
    },
    {
      $addFields: {
        distanceKm: {
          $round: [{ $divide: ["$distance", 1000] }, 2],
        },
      },
    },
    ...menuMatchStage,
  ]);

  res.json({
    success: true,
    count: restaurants.length,
    restaurants,
  });
});

export const fetchSingleRestaurant = TryCatch(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  res.json(restaurant);
});
