import { useState } from "react";
import { scanCccd } from "../services/cccdService";
import { Button, CircularProgress, Snackbar, Alert, Box } from "@mui/material";

const CccdScan = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFilePreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const data = await scanCccd(file);
      onSuccess(data);

      setSnackbar({ open: true, message: "Quét CCCD thành công!", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Quét CCCD thất bại", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 2, textAlign: "center" }}>
      <Button variant="contained" component="label" disabled={loading}>
        {loading ? <CircularProgress size={24} /> : "Quét CCCD"}
        <input type="file" hidden accept="image/*" onChange={handleFileChange} disabled={loading} />
      </Button>

      {filePreview && (
        <Box sx={{ mt: 1 }}>
          <img src={filePreview} alt="Preview" style={{ maxWidth: "200px", borderRadius: "8px" }} />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CccdScan;
