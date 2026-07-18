import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectDb } from "../config/db.js";
import { ObjectId } from "mongodb";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  restaurantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Please Login - No auth header",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        message: "Please Login - Token missing",
      });
      return;
    }

    const db = await connectDb();
    const isBlacklisted = await db.collection("tokenblacklists").findOne({ token });

    if (isBlacklisted) {
      res.status(401).json({
        message: "Token has been revoked/logged out",
      });
      return;
    }

    const decodedValue = jwt.verify(
      token,
      process.env.JWT_SEC as string
    ) as JwtPayload;

    if (!decodedValue || !decodedValue.user) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    // Always fetch fresh user from DB so that role changes (e.g. user selected
    // role after their initial login) are reflected immediately without
    // requiring a re-login. The JWT only carries the user id reliably.
    const userId = decodedValue.user._id;
    const freshUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!freshUser) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = {
      _id: freshUser._id.toString(),
      name: freshUser.name,
      email: freshUser.email,
      image: freshUser.image,
      role: freshUser.role,           // always the current DB value
      restaurantId: freshUser.restaurantId,
    };

    next();
  } catch (error) {
    res.status(500).json({
      message: "Please Login - Jwt error",
    });
  }
};

export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Please Login",
      });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        message: "Access denied",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      message: "Please Login",
    });
  }
};
