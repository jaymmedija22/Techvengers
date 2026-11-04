
import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid or missing password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        "http://localhost:3000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reset your password."
        );
      }

      setMessage(
        data.message || "Password reset successfully. You can now log in."
      );

      setPassword("");
      setConfirmPassword("");

      // Redirect to login after a short delay.
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-brand">
          <h1>HOPE</h1>
          <span>ERP SYSTEM</span>
        </div>

        <div className="reset-password-content">
          <h2>Reset Password</h2>
          <p>Enter your new password below.</p>

          {!token && (
            <p className="reset-password-error">
              Your reset link is missing a token. Please request a new one.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="reset-password-field">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                disabled={!token || isLoading}
              />
            </div>

            <div className="reset-password-field">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                minLength={8}
                required
                disabled={!token || isLoading}
              />
            </div>

            {error && (
              <p className="reset-password-error">{error}</p>
            )}

            {message && (
              <p className="reset-password-success">{message}</p>
            )}

            <button
              type="submit"
              disabled={!token || isLoading}
              className="reset-password-button"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="reset-password-back">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
