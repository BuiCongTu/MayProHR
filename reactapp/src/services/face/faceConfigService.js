import axios from "axios";

const faceConfigService = {
    getConfig: async () => {
        const res = await axios.get("/api/face/config");
        return res.data;
    },
};

export default faceConfigService;
