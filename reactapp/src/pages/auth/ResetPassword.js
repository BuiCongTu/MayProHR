import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

const ResetPassword = () =>
{
  const [token, setToken] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() =>
  {
    const sessionToken = sessionStorage.getItem("resetToken") || "reset-" + Date.now();
    setToken(sessionToken);
  }, []);

  const handleVerifyOtp = async (e) =>
  {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!otp.trim())
    {
      setError("Please enter OTP");
      setLoading(false);
      return;
    }

    try
    {
      setStep(2);
    } catch (err)
    {
      setError("Failed to verify OTP. Please try again.");
    } finally
    {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) =>
  {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword)
    {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6)
    {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try
    {
      const response = await axios.post("/api/auth/reset-password", {
        token: token,
        otp: otp.trim(),
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });

      if (response.status === 200 || response.data)
      {
        setMessage("Password reset successfully! Redirecting to login...");
        // Clear sessionStorage
        sessionStorage.removeItem("resetToken");
        sessionStorage.removeItem("resetEmailOrPhone");
        sessionStorage.removeItem("resetVerificationMethod");

        setTimeout(() =>
        {
          navigate("/login");
        }, 2000);
      }
    } catch (err)
    {
      let errorMessage = "Failed to reset password. Please try again.";

      if (err.response?.status === 504 || err.code === 'ECONNREFUSED')
      {
        errorMessage = "Backend server is not responding. Please ensure Spring Boot is running on port 9999.";
      } else if (err.response?.data?.message)
      {
        errorMessage = err.response.data.message;
      } else if (err.message)
      {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally
    {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-3">
              <label className="form-label">Enter OTP</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength="6"
                required
              />
              <small className="text-muted">Check your email/SMS for OTP</small>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary w-100 mt-2"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back to OTP
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remember your password?{" "}
            <a href="/login" className="auth-link">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
