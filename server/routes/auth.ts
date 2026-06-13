import { RequestHandler } from "express";
import { getSupabaseAdminClient } from "../lib/supabase";
import { createSessionToken } from "../lib/session";

export const handleLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // --- LOCAL FALLBACK CREDENTIALS (dev/demo only) ---
  // In production, set NODE_ENV=production on your hosting platform to disable these.
  if (process.env.NODE_ENV !== "production") {
    const MOCK_CREDENTIALS: Record<string, { name: string; role: string; pass: string }> = {
      "admin@antiaifinance.com": { name: "ANTI AI Admin", role: "admin", pass: "antiaifinance2024" },
      "team@antiaifinance.com": { name: "ANTI AI Team Member", role: "team", pass: "team2024" },
      "ca@antiaifinance.com": { name: "ANTI AI CA Auditor", role: "ca", pass: "ca2024" }
    };

    const mockUser = MOCK_CREDENTIALS[cleanEmail];
    if (mockUser && mockUser.pass === password) {
      const user = {
        id: `local-${cleanEmail.split("@")[0]}`,
        name: mockUser.name,
        email: cleanEmail,
        role: mockUser.role,
      };
      const token = createSessionToken(user);
      return res.status(200).json({ user, token });
    }
  }

  // --- DATABASE AUTHENTICATION ---
  try {
    const supabase = getSupabaseAdminClient();
    
    // Call verify_user RPC in Supabase
    const { data, error } = await supabase.rpc("verify_user", {
      p_email: cleanEmail,
      p_password: password,
    });

    if (error) {
      console.error("Login verify_user RPC error:", error);
      return res.status(500).json({ error: "Database error during validation" });
    }

    if (!data || data.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const dbUser = data[0];
    const user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };

    const token = createSessionToken(user);
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error("Unexpected login error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal login server error",
    });
  }
};

export const handleChangePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Extract user from verified session token (set by authenticateRequest middleware)
  const sessionUser = (req as any)._sessionUser;
  if (!sessionUser) {
    return res.status(401).json({ error: "Unauthorized. Valid session required." });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }

  // Handle mock users (only in non-production)
  if (sessionUser.id.startsWith("local-")) {
    return res.status(200).json({ message: "Password updated successfully (Local session)" });
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Call change_user_password RPC in Supabase
    const { data: isSuccess, error } = await supabase.rpc("change_user_password", {
      p_user_id: sessionUser.id,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    });

    if (error) {
      console.error("Change password RPC error:", error);
      return res.status(500).json({ error: "Database error during password change" });
    }

    if (!isSuccess) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Unexpected change password error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to change password",
    });
  }
};
