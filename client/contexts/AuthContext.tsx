import React, { createContext, useContext, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AUTH_STORAGE_KEY = "auth_user";
const CREDS_STORAGE_KEY = "auth_credentials";

// Default credentials — written to localStorage on first load only.
// After that, the user can change them via the app. Never stored in source code again.
const DEFAULT_EMAIL = "admin@antiaifinance.com";
const DEFAULT_PASSWORD = "antiaifinance2024";

function getStoredCredentials(): { email: string; password: string } {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  // First run — seed defaults into localStorage
  const defaults = { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
  localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<void> => {
    const creds = getStoredCredentials();
    if (email.trim() === creds.email && password === creds.password) {
      const loggedInUser: User = {
        id: "user-1",
        name: "ANTI AI Admin",
        email: creds.email,
        role: "admin",
      };
      setUser(loggedInUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    const creds = getStoredCredentials();
    if (currentPassword !== creds.password) {
      throw new Error("Current password is incorrect");
    }
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }
    // Persist new password
    localStorage.setItem(
      CREDS_STORAGE_KEY,
      JSON.stringify({ email: creds.email, password: newPassword })
    );
  };

  // Restore session on mount
  React.useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    // Ensure default credentials are seeded on first load
    getStoredCredentials();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
