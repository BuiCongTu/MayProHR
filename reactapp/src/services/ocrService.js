import axiosInstance from './api'; // Import instance bạn vừa gửi

export const scanCCCD = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Sử dụng axiosInstance để tự động có baseURL: '/api' và Bearer Token
    const response = await axiosInstance.post("/agent/scan-cccd", formData, {
        headers: { 
            'Content-Type': 'multipart/form-data' 
        }
    });
    
    let data = response.data;

    // Xử lý chuỗi JSON nếu AI trả về định dạng Markdown
    if (typeof data === 'string') {
        try {
            // Loại bỏ các ký tự bọc ```json và ``` của AI
            const cleanJson = data.replace(/```json|```/g, "").trim();
            data = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Lỗi phân giải JSON từ AI:", e);
        }
    }
    return data;
};