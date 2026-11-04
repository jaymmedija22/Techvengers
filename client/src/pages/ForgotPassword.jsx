
import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      setIsLoading(true);

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to process your request.");
      }

      setMessage(
        data.message ||
          "If your account is eligible, a password reset link will be sent to your email."
      );
      setEmail("");
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
          <h2>Forgot Password?</h2>
          <p>
            Enter the email address associated with your account.
            If your account is eligible, we'll send you a password reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="reset-password-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isLoading}
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
              disabled={isLoading}
              className="reset-password-button"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
