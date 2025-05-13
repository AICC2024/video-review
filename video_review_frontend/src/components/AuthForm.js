import React, { useState } from "react";
import axios from "axios";

const AuthForm = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const baseUrl = process.env.REACT_APP_BACKEND_URL || "";
      console.log("AuthForm → Using backend URL:", baseUrl);
      const url = baseUrl + (mode === "login" ? "/login" : "/register");
      const res = await axios.post(url, { username, password });

      const { token, username: returnedUsername } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("username", returnedUsername || username);

      const redirectTo = localStorage.getItem("redirectAfterLogin");
      localStorage.removeItem("redirectAfterLogin");

      onAuthSuccess({ token, username: returnedUsername, redirectTo });
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f8f8f8"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "100%",
        padding: "2rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#fff",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src="/naveon-logo.png" alt="Naveon Logo" style={{ height: "40px", marginBottom: "0.5rem" }} />
          <h2 style={{ margin: 0 }}>Video Review™</h2>
          <h3 style={{ marginTop: "0.5rem" }}>{mode === "login" ? "Login" : "Register"}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
          />
          {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
          <button type="submit" style={{ padding: "0.5rem 1rem", width: "100%", background: "#1976d2", color: "#fff", border: "none", borderRadius: "4px" }}>
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ marginTop: "1rem", background: "none", border: "none", color: "#1976d2", cursor: "pointer" }}>
          {mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
