import User from "../model/User.js";
import TokenBlacklist from "../model/TokenBlacklist.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";
import nodemailer from "nodemailer";
import Otp from "../model/Otp.js";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150";

export const loginUser = TryCatch(async (req, res) => {
  const { code, id_token } = req.body;

  if (!code && !id_token) {
    return res.status(400).json({
      message: "Authorization code or id_token is required",
    });
  }

  let googleEmail: string | undefined;
  let googleName: string | undefined;
  let picture: string | undefined;

  if (code) {
    try {
      const googleRes = await oauth2client.getToken(code);
      oauth2client.setCredentials(googleRes.tokens);
      const userRes = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
      );
      googleEmail = userRes.data.email;
      googleName  = userRes.data.name;
      picture     = userRes.data.picture;
    } catch (err: any) {
      console.error("Google token exchange failed:", err?.response?.data || err.message || err);
      return res.status(400).json({ message: "Google token exchange failed" });
    }
  } else if (id_token) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google Client ID is not configured on the server" });
    }
    try {
      const ticket = await oauth2client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleEmail = payload?.email;
      googleName  = payload?.name;
      picture     = payload?.picture as string | undefined;
    } catch (err: any) {
      console.error("ID token verification failed:", err?.message || err);
      return res.status(400).json({ message: "Invalid ID token" });
    }
  }

  if (!googleEmail) {
    return res.status(400).json({ message: "Failed to retrieve Google user info" });
  }

  // Always supply a name and image so mongoose required-field validation never fires.
  const safeName    = googleName  || googleEmail.split("@")[0] || "Forkful User";
  const safeImage   = picture     || DEFAULT_AVATAR;

  let user = await User.findOne({ email: googleEmail });

  if (!user) {
    user = await User.create({
      name:  safeName,
      email: googleEmail,
      image: safeImage,
    });
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.status(200).json({
    message: "Logged Success",
    token,
    user,
  });
});

export const devLoginUser = TryCatch(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not Found" });
  }

  const { email, name, role } = req.body;
  const devEmail = email || "developer@example.com";
  const devName  = name  || "Tomato Developer";
  const picture  = DEFAULT_AVATAR;

  let user = await User.findOne({ email: devEmail });

  if (!user) {
    user = await User.create({
      name:  devName,
      email: devEmail,
      image: picture,
      role:  role || undefined,
    });
  } else if (role) {
    user.role = role;
    await user.save();
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  return res.status(200).json({
    message: `Logged in as ${devName} successfully`,
    token,
    user,
  });
});

export const logoutUser = TryCatch(async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ message: "Authorization header is required" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const decoded    = jwt.decode(token) as any;
  const expiresAt  = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 2 * 60 * 60 * 1000);

  await TokenBlacklist.create({ token, expiresAt });

  res.status(200).json({ message: "Logged out successfully" });
});

const allowedRoles = ["customer", "rider", "seller"] as const;
type Role = (typeof allowedRoles)[number];

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { role } = req.body as { role: Role };

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const user = await User.findByIdAndUpdate(req.user._id, { role }, { new: true });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.json({ user, token });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(user);
});

export const sendOtp = TryCatch(async (req, res) => {
  const { email, mode } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate signup vs signin mode
  const userExists = await User.findOne({ email: cleanEmail });
  if (mode === "signin" && !userExists) {
    return res.status(400).json({ message: "This email is not registered. Please create one instead." });
  }
  if (mode === "signup" && userExists) {
    return res.status(400).json({ message: "This email is already registered. Please sign in instead." });
  }
  
  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save to database
  await Otp.findOneAndUpdate(
    { email: cleanEmail },
    { otp, createdAt: new Date() },
    { upsert: true, new: true }
  );

  console.log(`🔑 [OTP Verification] Generated OTP: ${otp} for ${cleanEmail}`);

  // Send email via nodemailer (best-effort)
  let emailSent = false;
  let etherealUrl = "";

  try {
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "janice.corkery21@ethereal.email",
          pass: "12R1aHh3Vw56CscF6F",
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"Forkful Auth" <auth@forkful.dev>',
      to: cleanEmail,
      subject: "Your Forkful Verification Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #FF5733;">Forkful Verification</h2>
          <p>Please use the following One-Time Password (OTP) to log in or register:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 10px; background-color: #f9f9f9; text-align: center; border-radius: 5px; color: #333; letter-spacing: 2px;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #777; margin-top: 20px;">This code expires in 5 minutes.</p>
        </div>
      `,
    });

    emailSent = true;
    etherealUrl = nodemailer.getTestMessageUrl(info) || "";
    if (etherealUrl) {
      console.log(`✉️ [OTP Ethereal URL]: ${etherealUrl}`);
    }
  } catch (mailErr: any) {
    console.warn("⚠️ [OTP Mail] Failed to send email via SMTP:", mailErr.message);
  }

  // OTP is NEVER returned in response to guarantee manual verification.
  res.status(200).json({
    message: "OTP sent successfully",
    emailSent,
    etherealUrl,
  });
});

export const verifyOtp = TryCatch(async (req, res) => {
  const { email, otp, name, adminCode } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  // Validate admin code if provided
  const adminAccessCode = process.env.ADMIN_ACCESS_CODE || "admin123";
  if (adminCode && adminCode.trim() !== adminAccessCode) {
    return res.status(400).json({ message: "Invalid admin access code" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const storedOtp = await Otp.findOne({ email: cleanEmail });

  if (!storedOtp || storedOtp.otp !== otp.trim()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Delete OTP upon verification
  await Otp.deleteOne({ _id: storedOtp._id });

  // Find or create user
  let user = await User.findOne({ email: cleanEmail });
  let isNewUser = false;

  const isAdminRegistration = adminCode && adminCode.trim() === adminAccessCode;

  if (!user) {
    isNewUser = true;
    const fallbackName = cleanEmail.split("@")[0];
    const safeName = name ? name.trim() : (fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
    
    user = await User.create({
      name: safeName,
      email: cleanEmail,
      image: DEFAULT_AVATAR,
      role: isAdminRegistration ? "admin" : null,
    });
  } else {
    // If the user already exists and signed in with the correct adminCode, elevate role
    if (isAdminRegistration) {
      user.role = "admin";
      await user.save();
    }
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.status(200).json({
    message: isNewUser ? "Account created successfully" : "Logged in successfully",
    token,
    user,
    isNewUser,
  });
});
