import User from "../model/User.js";
import TokenBlacklist from "../model/TokenBlacklist.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";
import nodemailer from "nodemailer";
import Otp from "../model/Otp.js";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150";

// Shared helper: generates a 6-digit OTP, stores it, and best-effort emails it.
// Returns { emailSent, etherealUrl } so callers can surface delivery status.
const generateAndSendOtp = async (cleanEmail: string): Promise<{ emailSent: boolean; etherealUrl: string }> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await Otp.findOneAndUpdate(
    { email: cleanEmail },
    { otp, createdAt: new Date() },
    { upsert: true, new: true }
  );

  console.log(`🔑 [OTP Verification] Generated OTP: ${otp} for ${cleanEmail}`);

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
          <p>Please use the following One-Time Password (OTP) to verify your account:</p>
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

  return { emailSent, etherealUrl };
};

export const loginUser = TryCatch(async (req, res) => {
  const { code, id_token, access_token } = req.body;

  if (!code && !id_token && !access_token) {
    return res.status(400).json({
      message: "Authorization code, id_token, or access_token is required",
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
  } else if (access_token) {
    // Implicit flow — access_token returned directly from @react-oauth/google
    try {
      const userRes = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
      );
      googleEmail = userRes.data.email;
      googleName  = userRes.data.name;
      picture     = userRes.data.picture;
    } catch (err: any) {
      console.error("Google userinfo fetch failed:", err?.response?.data || err.message || err);
      return res.status(400).json({ message: "Google sign in failed" });
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
      isVerified: true,
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
      isVerified: true,
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

export const updateProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { dietaryPreferences, allergies, healthGoals } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (dietaryPreferences !== undefined) user.dietaryPreferences = dietaryPreferences;
  if (allergies !== undefined) user.allergies = allergies;
  if (healthGoals !== undefined) user.healthGoals = healthGoals;

  await user.save();

  // Issue updated token
  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.json({ message: "Profile updated successfully", user, token });
});

export const sendOtp = TryCatch(async (req, res) => {
  const { email, mode } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate signup vs signin mode. A user who registered with a password
  // but never completed OTP verification is still treated as "in signup"
  // so they can request a fresh code without hitting a duplicate-email error.
  const userExists = await User.findOne({ email: cleanEmail });
  const isUnverifiedPasswordAccount = !!userExists && !userExists.isVerified;

  if (mode === "signin" && !userExists) {
    return res.status(400).json({ message: "This email is not registered. Please create one instead." });
  }
  if (mode === "signup" && userExists && !isUnverifiedPasswordAccount) {
    return res.status(400).json({ message: "This email is already registered. Please sign in instead." });
  }

  const { emailSent, etherealUrl } = await generateAndSendOtp(cleanEmail);

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
      isVerified: true,
    });
  } else {
    // Existing account (e.g. registered via password but not yet verified,
    // or an OTP-only returning user). Verifying always confirms the email.
    let changed = false;
    if (!user.isVerified) {
      user.isVerified = true;
      changed = true;
    }
    if (isAdminRegistration) {
      user.role = "admin";
      changed = true;
    }
    if (changed) await user.save();
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.status(200).json({
    message: isNewUser
      ? "Account created successfully"
      : "Email verified successfully — you're all set!",
    token,
    user,
    isNewUser,
  });
});

export const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

export const registerPassword = TryCatch(async (req, res) => {
  const { firstName, lastName, mobileNumber, email, password, confirmPassword, authorityCode } = req.body;

  if (!email || !password || !firstName || !lastName || !mobileNumber) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  if (!confirmPassword || password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser && existingUser.isVerified) {
    return res.status(400).json({ message: "Email is already registered. Please sign in instead." });
  }

  // Validate authority code if provided
  const adminAccessCode = process.env.ADMIN_ACCESS_CODE || "admin123";
  const isAdminRegistration = authorityCode && authorityCode.trim() === adminAccessCode;
  if (authorityCode && !isAdminRegistration) {
    return res.status(400).json({ message: "Invalid authority/admin access code" });
  }

  const hashedPassword = hashPassword(password);
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  let user;
  if (existingUser && !existingUser.isVerified) {
    // They started registering before but never verified — update details & resend OTP.
    existingUser.name = fullName;
    existingUser.firstName = firstName.trim();
    existingUser.lastName = lastName.trim();
    existingUser.mobileNumber = mobileNumber.trim();
    existingUser.password = hashedPassword;
    if (isAdminRegistration) {
      existingUser.role = "admin";
    }
    user = await existingUser.save();
  } else {
    user = await User.create({
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: cleanEmail,
      password: hashedPassword,
      image: DEFAULT_AVATAR,
      role: isAdminRegistration ? "admin" : null,
      isVerified: false,
    });
  }

  const { emailSent, etherealUrl } = await generateAndSendOtp(cleanEmail);

  // No token is issued here — the account only becomes usable once the
  // emailed OTP is confirmed via /verify-otp.
  res.status(201).json({
    message: "Almost there! Enter the code we emailed you to activate your account.",
    requiresVerification: true,
    email: cleanEmail,
    emailSent,
    etherealUrl,
  });
});

export const loginPassword = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    return res.status(400).json({ message: "This email is not registered. Please register first." });
  }

  if (!user.password) {
    return res.status(400).json({ message: "This account was registered using another method. Please use that instead." });
  }

  const hashedPassword = hashPassword(password);
  if (user.password !== hashedPassword) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  if (!user.isVerified) {
    // Nudge them back into the verification flow instead of silently failing.
    await generateAndSendOtp(cleanEmail);
    return res.status(403).json({
      message: "Please verify your email to continue. We've sent a fresh code to your inbox.",
      requiresVerification: true,
      email: cleanEmail,
    });
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.status(200).json({
    message: "Logged in successfully",
    token,
    user,
  });
});

export const guestLogin = TryCatch(async (req, res) => {
  const guestEmail = `guest_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}@forkful.dev`;
  const user = await User.create({
    name: "Guest Customer",
    email: guestEmail,
    image: DEFAULT_AVATAR,
    role: "customer",
    isVerified: true,
  });

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "2h",
  });

  res.status(200).json({
    message: "Logged in as guest successfully",
    token,
    user,
  });
});
