import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  if (typeof hostname === "string" && hostname.includes("mongodb.net")) {
    return dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) return callback(null, addresses.map(a => ({ address: a, family: 4 })));
        return callback(null, addresses[0], 4);
      }
      origLookup(hostname, options, callback);
    });
  }
  origLookup(hostname, options, callback);
};

import { MongoClient, ObjectId } from "./services/restaurant/node_modules/mongodb/lib/index.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://your_mongodb_user:your_mongodb_password@localhost:27017/Zomato_Clone?authSource=admin&retryWrites=true&w=majority";

async function seed() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("Zomato_Clone");

  console.log("Connected to MongoDB Atlas!");

  // Use existing seller or fallback
  const seller = await db.collection("users").findOne({ role: "seller" });
  const sellerId = seller ? seller._id.toString() : "6a3710a73a68cf097beb3ba9";

  const newRestaurants = [
    {
      name: "Amritsari Kulcha Hub",
      description: "Authentic tandoor-crisped Amritsari kulchas, pindi chole and rich Punjabi lassi",
      image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
      ownerId: sellerId,
      phone: 9814123456,
      isVerified: true,
      isOpen: true,
      aadharNumber: "456789123456",
      autoLocation: {
        type: "Point",
        coordinates: [76.7118, 30.7046], // Phase 7 Mohali
        formattedAddress: "Phase 7, Sector 61, SAS Nagar, Mohali, Punjab 160062",
      },
      overallRating: 4.9,
      ratingCount: 380,
      totalEarnings: 45000,
      createdAt: new Date(),
      menu: [
        {
          name: "Amritsari Aloo Pyaaz Kulcha with Chole",
          description: "Crispy layered tandoor kulcha stuffed with spiced potatoes and onions, served with authentic pindi chole, tamarind onion chutney and dollop of white butter.",
          price: 180,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Paneer Masala Stuffed Kulcha",
          description: "Stuffed with seasoned Malai paneer, fresh coriander, green chillies and roasted anardana.",
          price: 230,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Special Malai Lassi (500ml)",
          description: "Creamy hand-churned Punjabi sweet lassi topped with thick malai and crushed dry fruits.",
          price: 90,
          category: "Beverages",
          image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Chole Bhature Duo",
          description: "Two fluffy bhaturas served with spicy Amritsari chole, pickled ginger and onions.",
          price: 160,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        }
      ]
    },
    {
      name: "Pal Dhaba & Tandoor",
      description: "Legendary Chandigarh Punjabi dhaba famous for butter chicken, dal makhani & mutton curry",
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
      ownerId: sellerId,
      phone: 9888123456,
      isVerified: true,
      isOpen: true,
      aadharNumber: "789123456789",
      autoLocation: {
        type: "Point",
        coordinates: [76.7925, 30.7164], // Sector 28-D Chandigarh
        formattedAddress: "SCO 151-152, Sector 28-D, Chandigarh, 160028",
      },
      overallRating: 4.8,
      ratingCount: 520,
      totalEarnings: 82000,
      createdAt: new Date(),
      menu: [
        {
          name: "Signature Butter Chicken",
          description: "Charcoal-grilled chicken simmered in rich creamy tomato and cashew nut gravy.",
          price: 390,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
          isVeg: false,
        },
        {
          name: "Dal Makhani Handi",
          description: "Slow-cooked black lentils overnight on tandoor embers with churned butter and cream.",
          price: 240,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Garlic Naan Basket",
          description: "Crispy tandoori naan brushed with crushed roasted garlic and fresh cilantro.",
          price: 55,
          category: "Breads",
          image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Mutton Rogan Josh",
          description: "Tender goat meat slow braised in Kashmiri chili, fennel and whole aromatic spices.",
          price: 430,
          category: "North Indian",
          image: "https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=600&q=80",
          isVeg: false,
        }
      ]
    },
    {
      name: "Sector 35 Food Street - Burgers & Shakes",
      description: "Gourmet smashed burgers, loaded peri peri fries and artisanal thick shakes",
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
      ownerId: sellerId,
      phone: 9872123456,
      isVerified: true,
      isOpen: true,
      aadharNumber: "123456789123",
      autoLocation: {
        type: "Point",
        coordinates: [76.7645, 30.7225], // Sector 35-C Chandigarh
        formattedAddress: "SCO 425-426, Sector 35-C, Chandigarh, 160035",
      },
      overallRating: 4.7,
      ratingCount: 310,
      totalEarnings: 39000,
      createdAt: new Date(),
      menu: [
        {
          name: "Truffle Mushroom Smash Burger",
          description: "Double smashed crispy patty with melted cheddar, sautéed garlic mushrooms and truffle aioli on brioche.",
          price: 299,
          category: "Fast Food",
          image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
          isVeg: false,
        },
        {
          name: "Crispy Paneer Deluxe Burger",
          description: "Herb-crusted cottage cheese steak, chipotle slaw, jalapenos and house spicy mayo.",
          price: 249,
          category: "Fast Food",
          image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Loaded Peri Peri Crinkle Fries",
          description: "Crispy crinkle fries tossed in fiery African bird's eye spice with cheese drizzle.",
          price: 159,
          category: "Sides",
          image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        },
        {
          name: "Belgian Chocolate Shake",
          description: "Thick double Belgian cocoa shake with fudge chunks and chocolate whipped cream.",
          price: 199,
          category: "Beverages",
          image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
          isVeg: true,
        }
      ]
    }
  ];

  for (const item of newRestaurants) {
    const existing = await db.collection("restaurants").findOne({ name: item.name });
    let restId;
    if (existing) {
      console.log(`Updating existing restaurant: ${item.name}`);
      await db.collection("restaurants").updateOne(
        { _id: existing._id },
        {
          $set: {
            description: item.description,
            image: item.image,
            phone: item.phone,
            isVerified: true,
            isOpen: true,
            autoLocation: item.autoLocation,
            overallRating: item.overallRating,
            ratingCount: item.ratingCount,
          }
        }
      );
      restId = existing._id;
    } else {
      console.log(`Inserting new restaurant: ${item.name}`);
      const restDoc = {
        name: item.name,
        description: item.description,
        image: item.image,
        ownerId: item.ownerId,
        phone: item.phone,
        isVerified: true,
        isOpen: true,
        aadharNumber: item.aadharNumber,
        autoLocation: item.autoLocation,
        overallRating: item.overallRating,
        ratingCount: item.ratingCount,
        totalEarnings: item.totalEarnings,
        createdAt: item.createdAt,
      };
      const res = await db.collection("restaurants").insertOne(restDoc);
      restId = res.insertedId;
    }

    // Seed menu items
    for (const m of item.menu) {
      const existingMenu = await db.collection("menuitems").findOne({
        restaurantId: restId,
        name: m.name
      });
      if (!existingMenu) {
        await db.collection("menuitems").insertOne({
          restaurantId: restId,
          name: m.name,
          description: m.description,
          price: m.price,
          category: m.category,
          image: m.image,
          isVeg: m.isVeg,
          createdAt: new Date(),
        });
        console.log(`  + Added menu item: ${m.name}`);
      }
    }
  }

  // Ensure 2dsphere index on autoLocation
  await db.collection("restaurants").createIndex({ autoLocation: "2dsphere" });
  console.log("Successfully seeded restaurants and verified 2dsphere index!");

  await client.close();
}

seed().catch(console.error);
