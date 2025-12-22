import axios from 'axios';
import alert from "bootstrap/js/src/alert";
import { useEffect, useRef, useState } from 'react';
import CameraCapture from '../../../components/attendance/CameraCapture';
import faceConfigService from '../../../services/face/faceConfigService';

const CheckInPage = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [faceConfig, setFaceConfig] = useState(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const cfg = await faceConfigService.getConfig();
                if (cfg?.success) setFaceConfig(cfg);
            } catch {
                // config chỉ để hiển thị, fail cũng không chặn nghiệp vụ
            }
        })();

        // Cleanup: tắt camera khi rời trang
        return () => {
            if (cameraRef.current?.stopCamera) {
                cameraRef.current.stopCamera();
            }
        };
    }, []);

    const handleCapture = async (imageBase64) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('/api/face-scan/attendance', {
                imageBase64,
                scanType: "CHECK_IN"
            });

            if (response.data.success) {
                // Tắt camera khi check-in thành công
                if (cameraRef.current?.stopCamera) {
                    cameraRef.current.stopCamera();
                }
                setResult(response.data);
                alert('success', `Hello ${response.data.fullName}. Check-in successfully at ${response.data.timeIn}`);
            } else {
                setError(response.data.message);
            }
        } catch (e) {
            const errorMessage = e.response?.data?.message || 'An error occurred. Please try again.';
            setError(errorMessage);
            alert('error', errorMessage);
        } finally {
            setLoading(false);
        }
    }

    //reset
    const reset = () => {
        setResult(null);
        setError(null);
    }

    return (
        <div>
            <h1>Check-In</h1>

            {faceConfig && (
                <div style={{marginBottom: 12, fontSize: 13, opacity: 0.85}}>
                    <div><b>Face Model:</b> {faceConfig.modelVersion}</div>
                    <div><b>Threshold:</b> {faceConfig.recognitionThreshold}</div>
                    <div><b>Min-gap:</b> {faceConfig.minGap}</div>
                </div>
            )}

            {!result ? (
                <>
                    <CameraCapture ref={cameraRef} onCapture={handleCapture} autoCapture={false}/>
                    {loading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Scanning face...</p>
                        </div>
                    )}

                {error && (
                    <div className="error-box">
                        <h3>Error</h3>
                        <p>{error}</p>
                        <button onClick={reset}>Try Again</button>
                    </div>
                )}
                </>
            ) : (
                <div className="success-box">
                    <div className="success-icon"></div>
                    <h2>Check-In Successful!</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Employee:</span>
                            <span className="info-value">{result.fullName}</span>
                        </div>
                        {/* ... existing code ... */}
                    </div>
                    <div className="actions">
                        <button onClick={reset}>Done</button>
                        <a href="/attendance/history" className="history-link">View History</a>
                    </div>
                </div>
            )}
        </div>
    );
}
export default CheckInPage;