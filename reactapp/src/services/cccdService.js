import axios from "axios";

const API_BASE = "http://localhost:9999/api/cccd";

export const scanCccd = async (file) =>
{
  const formData = new FormData();
  // Backend nhận @RequestParam("file")
  formData.append("file", file);

  const response = await axios.post(`${API_BASE}/scan`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export default { scanCccd };
