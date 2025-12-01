import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

const ForgotPassword = () =>
{
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("EMAIL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) =>
  {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try
    {
      const response = await axios.post("/api/auth/forgot-password", {
        emailOrPhone: emailOrPhone.trim(),
        verificationMethod: verificationMethod,
      });

      if (response.status === 200 && response.data.data)
      {
        setMessage(`OTP sent to your ${verificationMethod.toLowerCase()}`);
        sessionStorage.setItem("resetEmailOrPhone", emailOrPhone);
        sessionStorage.setItem("resetVerificationMethod", verificationMethod);
        sessionStorage.setItem("resetToken", response.data.data);

        setTimeout(() =>
        {
          navigate("/reset-password");
        }, 2000);
      }
    } catch (err)
    {
      let errorMessage = "Failed to send OTP. Please try again.";

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
        <h2>Forgot Password</h2>
        <p>Enter your email or phone number to receive an OTP</p>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Verification Method</label>
            <select
              className="form-control"
              value={verificationMethod}
              onChange={(e) => setVerificationMethod(e.target.value)}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">
              {verificationMethod === "EMAIL"
                ? "Email Address"
                : "Phone Number"}
            </label>
            <input
              type={verificationMethod === "EMAIL" ? "email" : "tel"}
              className="form-control"
              placeholder={
                verificationMethod === "EMAIL"
                  ? "Enter your email"
                  : "Enter your phone number"
              }
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

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

export default ForgotPassword;
