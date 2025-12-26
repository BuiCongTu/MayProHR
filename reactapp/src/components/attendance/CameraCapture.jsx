import { Close, PhotoCamera } from "@mui/icons-material";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const CameraCapture = forwardRef(({ onCapture, autoCapture = false, autoStopOnCapture = false, width = 640, height = 480 }, ref) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [lastCapture, setLastCapture] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: width },
                    height: { ideal: height },
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
                setError(null);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Cannot access camera. Please make sure you have granted camera access in your browser settings.');
        }
    };

    const stopCamera = useCallback(() => {
        try {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => {
                    track.stop();
                    console.log(`Camera track ${track.kind} stopped`);
                });
                videoRef.current.srcObject = null;
                setIsStreaming(false);
                setError(null);
            }
        } catch (err) {
            console.error('Error stopping camera:', err);
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            // Cleanup: stop camera when component unmounts
            stopCamera();
        };
    }, [stopCamera]);

    // Expose stopCamera and startCamera methods to parent via ref
    useImperativeHandle(ref, () => ({
        stopCamera,
        startCamera,
        isStreaming
    }), [stopCamera, isStreaming]);

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) return null;

        try {
            setIsCapturing(true);
            setError(null); // Clear previous errors
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            // Set canvas size to match video
            canvas.width = video.videoWidth || width;
            canvas.height = video.videoHeight || height;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to base64 (data URL format)
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

            // Store for preview
            setLastCapture(imageBase64);

            // Call callback if provided
            if (onCapture) {
                await onCapture(imageBase64);
            }

            // Auto-stop camera after successful capture if enabled
            if (autoStopOnCapture) {
                setTimeout(() => {
                    stopCamera();
                }, 500); // Small delay to ensure smooth UX
            }

            return imageBase64;
        } catch (err) {
            console.error('Error capturing image:', err);
            setError('Error capturing image:');
            // Auto-stop on error to allow user to restart fresh
            if (autoStopOnCapture) {
                setTimeout(() => {
                    stopCamera();
                }, 1000);
            }
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            {/* Error message */}
            {error && (
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee', borderLeft: '4px solid #f44336' }}>
                    <Typography color="error" variant="body2">
                        ⚠️ {error}
                    </Typography>
                </Paper>
            )}

            {/* Video Preview */}
            <Paper sx={{ mb: 2, overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        aspectRatio: `${width}/${height}`
                    }}
                />
                {!isStreaming && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.8)'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
            </Paper>

            {/* Last captured image preview */}
            {lastCapture && (
                <Paper sx={{ mb: 2, overflow: 'hidden', backgroundColor: '#f5f5f5', p: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                        📷 Captured Image:
                    </Typography>
                    <Box
                        component="img"
                        src={lastCapture}
                        alt="Captured"
                        sx={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                </Paper>
            )}

            {/* Control Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                {!isStreaming && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PhotoCamera />}
                        onClick={startCamera}
                    >
                        Start Camera
                    </Button>
                )}

                {isStreaming && (
                    <>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<PhotoCamera />}
                            onClick={captureImage}
                            disabled={isCapturing}
                        >
                            {isCapturing ? 'Capturing...' : 'Capture'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Close />}
                            onClick={stopCamera}
                        >
                            Stop Camera
                        </Button>
                    </>
                )}
            </Box>

            {/* Instructions */}
            <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196F3' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    📝 Instructions:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2">✓ Look straight at the camera</Typography>
                    <Typography component="li" variant="body2">✓ Ensure sufficient lighting</Typography>
                    <Typography component="li" variant="body2">✓ Do NOT wear a mask</Typography>
                    <Typography component="li" variant="body2">✓ Face should occupy ~70% of the frame</Typography>
                </Box>
            </Paper>

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
    );
});

CameraCapture.displayName = 'CameraCapture';
export default CameraCapture;
