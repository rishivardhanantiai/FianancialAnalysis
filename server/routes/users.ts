import { RequestHandler } from "express";
import { getSupabaseAdminClient } from "../lib/supabase";

const TABLE_NAME = "users";

export const listUsers: RequestHandler = async (req, res) => {
  const userRole = req.headers["x-user-role"] as string;

  // Double check role authorization: Admin and Team can list users, CA cannot.
  if (userRole === "ca") {
    return res.status(403).json({ error: "Forbidden. CA users cannot view team members." });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("List users error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ users: data ?? [] });
  } catch (error) {
    console.error("Unexpected list users error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list team members",
    });
  }
};

export const createUser: RequestHandler = async (req, res) => {
  const { email, password, name, role } = req.body;
  const userRole = req.headers["x-user-role"] as string;

  // Only Admin can create users
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden. Only Admins can add team members." });
  }

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  if (!["admin", "team", "ca"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Role must be admin, team, or ca." });
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Call create_user RPC
    const { data: newUserId, error } = await supabase.rpc("create_user", {
      p_email: email.trim(),
      p_password: password,
      p_name: name.trim(),
      p_role: role,
    });

    if (error) {
      console.error("Create user RPC error:", error);
      if (error.message.includes("unique") || error.code === "23505") {
        return res.status(400).json({ error: "A user with this email already exists." });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUserId,
        email: email.trim(),
        name: name.trim(),
        role,
      },
    });
  } catch (error) {
    console.error("Unexpected create user error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create team member",
    });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers["x-user-role"] as string;
  const userEmail = req.headers["x-user-email"] as string;

  // Only Admin can delete users
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden. Only Admins can delete team members." });
  }

  if (!id) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const supabase = getSupabaseAdminClient();

    // First fetch the user to prevent deleting oneself
    const { data: targetUser, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select("email")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Fetch target user for delete error:", fetchError);
      return res.status(404).json({ error: "User not found." });
    }

    if (targetUser && targetUser.email.toLowerCase() === userEmail.toLowerCase()) {
      return res.status(400).json({ error: "You cannot delete your own logged-in account." });
    }

    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Unexpected delete user error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete team member",
    });
  }
};

export const updateUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  const userRole = req.headers["x-user-role"] as string;

  // Only Admin can update users
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden. Only Admins can modify team members." });
  }

  if (!id || !name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required." });
  }

  if (!["admin", "team", "ca"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Role must be admin, team, or ca." });
  }

  try {
    const supabase = getSupabaseAdminClient();
    
    const { data: isSuccess, error } = await supabase.rpc("admin_update_user", {
      p_user_id: id,
      p_name: name.trim(),
      p_email: email.trim(),
      p_role: role,
      p_password: password && password.trim() !== "" ? password : null
    });

    if (error) {
      console.error("Update user RPC error:", error);
      if (error.message.includes("unique") || error.code === "23505") {
        return res.status(400).json({ error: "A user with this email already exists." });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Unexpected update user error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update team member",
    });
  }
};
