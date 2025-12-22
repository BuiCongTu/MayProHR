import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import CameraCapture from '../../components/attendance/CameraCapture';
import attendanceService from '../../services/moduleA/attendanceService';

const RegisterFacePage = () => {
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [lines, setLines] = useState([]);
    const [selectedLine, setSelectedLine] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [showUserDetail, setShowUserDetail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const [accessDenied, setAccessDenied] = useState(false);
    const cameraRef = useRef(null);

    useEffect(() => {
        checkRoleAccess();
        fetchDepartments();
        fetchUsers();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [selectedDept, selectedLine, filterStatus, allUsers]);

    // ---- Check role ----
    const checkRoleAccess = () => {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return setAccessDenied(true);
            const u = JSON.parse(raw);
            const role = (u.roleName || u.role || '').toString().trim().toUpperCase();
            if (!(role === 'HR' || role === 'ADMIN')) setAccessDenied(true);
        } catch {
            setAccessDenied(true);
        }
    };

    // ---- Fetch Departments ----
    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/department');
            const data = res?.data?.data ?? res?.data ?? [];
            setDepartments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch departments:', e);
        }
    };

    // ---- Fetch Users ----
    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/user');
            const data = res?.data?.data ?? res?.data ?? [];
            setUsers(Array.isArray(data) ? data : []);
            setAllUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch users:', e);
            setError('Không thể tải danh sách nhân viên');
        }
    };

    // ---- Fetch Lines by Department ----
    const fetchLines = async (deptId) => {
        if (!deptId) {
            setLines([]);
            return;
        }
        try {
            const res = await axios.get(`/api/lines/department/${deptId}`);
            const data = res?.data?.data ?? res?.data ?? [];
            setLines(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch lines:', e);
            setLines([]);
        }
    };

    // ---- Handle User Select ----
    const handleUserSelect = (userId) => {
        setSelectedUserId(String(userId));
        setShowUserDetail(true);
        setError(null);
        setResult(null);
    };

    const proceedToCapture = () => {
        setShowUserDetail(false);
        setStep(2);
    };

    // ---- Get token helper ----
    const getToken = () => {
        // common storage keys
        const keys = ['accessToken', 'access_token', 'token', 'authToken', 'authorization'];
        for (const k of keys) {
            const val = localStorage.getItem(k);
            if (val) return normalizeToken(val);
        }

        // try parsing `user` object
        const rawUser = localStorage.getItem('user');
        if (rawUser) {
            try {
                const u = JSON.parse(rawUser);
                const candidates = ['accessToken', 'access_token', 'token', 'authToken', 'jwt', 'bearerToken'];
                for (const c of candidates) {
                    if (u[c]) return normalizeToken(String(u[c]));
                }
                if (u.data) {
                    for (const c of candidates) {
                        if (u.data[c]) return normalizeToken(String(u.data[c]));
                    }
                }
                // fallback common fields
                if (u.token) return normalizeToken(String(u.token));
            } catch (e) {
                console.debug('getToken: failed to parse user from localStorage', e);
            }
        }

        // not found -> inform user and force login
        alert('❌ Token hết hạn, vui lòng đăng nhập lại.');
        window.location.href = '/login';
        return null;

        // helper
        function normalizeToken(t) {
            const s = t.trim();
            // if stored as "Bearer xxxxx", strip prefix (so callers can reliably add Bearer if needed)
            return s.replace(/^Bearer\s+/i, '');
        }
    };

    // ---- Handle Capture Face ----
    const handleCapture = async (imageBase64) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            if (!selectedUserId) return alert('❌ Chưa chọn nhân viên.');
            if (!imageBase64 || imageBase64.length < 100) return alert('❌ Hình ảnh không hợp lệ.');

            const token = getToken();
            if (!token) return;

            const data = await attendanceService.registerFace(selectedUserId, imageBase64);

            if (data.success) {
                // Tắt camera ngay khi thành công
                if (cameraRef.current?.stopCamera) {
                    cameraRef.current.stopCamera();
                }
                setResult(data);
                alert('✅ Đăng ký khuôn mặt thành công!');
                setStep(3);
            } else {
                setError(data.message || 'Đăng ký thất bại');
                // Tắt camera khi có lỗi để user restart
                if (cameraRef.current?.stopCamera) {
                    setTimeout(() => cameraRef.current.stopCamera(), 1000);
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Có lỗi khi đăng ký khuôn mặt';
            setError(msg);
            alert('❌ ' + msg);
            // Tắt camera khi exception
            if (cameraRef.current?.stopCamera) {
                setTimeout(() => cameraRef.current.stopCamera(), 1000);
            }
        } finally {
            setLoading(false);
        }
    };

    // ---- Handle Train Model ----
    const handleTrainModel = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) return;

            const response = await attendanceService.trainModel();
            if (response.success) {
                setResult({ ...result, modelTrained: true });
                alert('✅ Huấn luyện mô hình thành công!');
            } else {
                setError(response.message);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Có lỗi huấn luyện mô hình';
            setError(msg);
            alert('❌ ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setSelectedUserId('');
        setResult(null);
        setError(null);
    };

    const getSelectedUser = () => {
        return allUsers.find(u => String(u.userId ?? u.id) === String(selectedUserId));
    };

    const applyFilters = () => {
        let list = [...allUsers];
        if (selectedDept) list = list.filter(u => (u.department?.id ?? u.departmentId) === selectedDept);
        if (selectedLine) list = list.filter(u => (u.line?.id ?? u.lineId) === selectedLine);
        if (filterStatus === 'registered') list = list.filter(u => !!(u.faceData ?? u.face_data));
        else if (filterStatus === 'not_registered') list = list.filter(u => !(u.faceData ?? u.face_data));
        setUsers(list);
    };

    if (accessDenied) return (
        <div style={{ textAlign: 'center', marginTop: 50 }}>
            <h2>Quyền truy cập bị từ chối</h2>
            <p>Bạn cần đăng nhập bằng tài khoản HR hoặc Admin.</p>
        </div>
    );

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>👤 Đăng Ký Khuôn Mặt</h1>
                <p style={styles.subtitle}>Chỉ dành cho HR/Admin - Đăng ký nhân viên mới</p>
            </div>

            {/* Progress Steps */}
            <div style={styles.progressBar}>
                <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.activeStep : {}) }}>
                    <div style={styles.stepNumber}>1</div>
                    <span>Chọn Nhân Viên</span>
                </div>
                <div style={styles.progressLine}></div>
                <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.activeStep : {}) }}>
                    <div style={styles.stepNumber}>2</div>
                    <span>Chụp Khuôn Mặt</span>
                </div>
                <div style={styles.progressLine}></div>
                <div style={{ ...styles.progressStep, ...(step >= 3 ? styles.activeStep : {}) }}>
                    <div style={styles.stepNumber}>3</div>
                    <span>Huấn Luyện</span>
                </div>
            </div>

            {/* Step 1: Select User */}
            {step === 1 && (
                <div style={styles.userListContainer}>
                    <h3 style={styles.sectionTitle}>Chọn Nhân Viên Cần Đăng Ký</h3>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <select
                                value={selectedDept ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value ? Number(e.target.value) : null;
                                    setSelectedDept(v);
                                    setSelectedLine(null);
                                    fetchLines(v);
                                }}
                                style={{ width: '100%', padding: 10, borderRadius: 6 }}
                            >
                                <option value="">-- Chọn Phòng Ban --</option>
                                {departments.map(d => (
                                    <option key={d.id ?? d.departmentId} value={d.id ?? d.departmentId}>{d.name ?? d.departmentName}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: 1 }}>
                            <select
                                value={selectedLine ?? ''}
                                onChange={(e) => setSelectedLine(e.target.value ? Number(e.target.value) : null)}
                                style={{ width: '100%', padding: 10, borderRadius: 6 }}
                            >
                                <option value="">-- Chọn Line --</option>
                                {lines.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ width: '100%', padding: 10, borderRadius: 6 }}
                            >
                                <option value="all">Tất cả</option>
                                <option value="registered">Đã đăng ký face</option>
                                <option value="not_registered">Chưa đăng ký face</option>
                            </select>
                        </div>
                    </div>
                    <div style={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm nhân viên..."
                            style={styles.searchInput}
                            onChange={(e) => {
                                const query = e.target.value.toLowerCase().trim();
                                if (!query) {
                                    setUsers(allUsers);
                                    return;
                                }
                                const filtered = allUsers.filter(u => {
                                    const name = (u.fullName || u.full_name || u.name || '').toString().toLowerCase();
                                    const email = (u.email || u.emailAddress || '').toString().toLowerCase();
                                    return name.includes(query) || email.includes(query);
                                });
                                setUsers(filtered);
                            }}
                        />
                    </div>
                    <div style={styles.userList}>
                        {Array.isArray(users) && users.map(user => {
                            const id = user.userId ?? user.id ?? user.uuid ?? '';
                            return (
                                <div
                                    key={id}
                                    style={styles.userCard}
                                    onClick={() => handleUserSelect(id)}
                                >
                                    <div style={styles.userAvatar}>
                                        {(user.fullName || user.full_name || user.name || '?').toString().charAt(0) || '?'}
                                    </div>
                                    <div style={styles.userInfo}>
                                        <div style={styles.userName}>{user.fullName || user.full_name || user.name}</div>
                                        <div style={styles.userEmail}>{user.email || user.emailAddress || ''}</div>
                                        <div style={styles.userDepartment}>
                                            {user.department?.name || user.departmentName || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected user detail (before capture) */}
                    {showUserDetail && selectedUserId && (
                        <div style={{ marginTop: 20, padding: 20, border: '2px solid #eee', borderRadius: 8, background: '#fafafa' }}>
                            <h3>Chi tiết nhân viên</h3>
                            {(() => {
                                const su = getSelectedUser();
                                if (!su) return <p>Không tìm thấy nhân viên</p>;
                                const hasFace = !!(su.faceData ?? su.face_data ?? null);
                                return (
                                    <div>
                                        <p><strong>Tên:</strong> {su.fullName || su.full_name || su.name}</p>
                                        <p><strong>SDT:</strong> {su.phone}</p>
                                        <p><strong>Email:</strong> {su.email}</p>
                                        <p><strong>Phòng ban:</strong> {su.department?.name || su.departmentName || 'N/A'}</p>
                                        <p><strong>Line:</strong> {su.line?.name || su.lineName || 'N/A'}</p>
                                        <p><strong>Trạng thái:</strong> {hasFace ? 'Đã đăng ký face' : 'Chưa đăng ký face'}</p>

                                        <div style={{ marginTop: 12 }}>
                                            {!hasFace ? (
                                                <button onClick={proceedToCapture} style={styles.trainButton}>Chụp Khuôn Mặt</button>
                                            ) : (
                                                <div>
                                                    <button onClick={proceedToCapture} style={styles.trainButton}>Đăng ký lại / Chụp lại</button>
                                                </div>
                                            )}
                                            <button onClick={() => setShowUserDetail(false)} style={{ marginLeft: 12, padding: '10px 20px' }}>Đóng</button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Capture Face */}
            {step === 2 && (
                <div style={styles.captureContainer}>
                    <div style={styles.selectedUserBanner}>
                        <h3>Đăng ký khuôn mặt cho: <strong>{getSelectedUser()?.fullName}</strong></h3>
                    </div>

                    <CameraCapture
                        ref={cameraRef}
                        onCapture={handleCapture}
                        autoCapture={false}
                    />

                    {loading && (
                        <div style={styles.loadingOverlay}>
                            <div style={styles.spinner}></div>
                            <p>Đang xử lý khuôn mặt...</p>
                        </div>
                    )}

                    {error && (
                        <div style={styles.errorBox}>
                            <h3>❌ Thất Bại</h3>
                            <p>{error}</p>
                            <button onClick={() => setError(null)} style={styles.retryButton}>
                                Thử Lại
                            </button>
                        </div>
                    )}

                    <button onClick={() => setStep(1)} style={styles.backButton}>
                        ← Quay Lại
                    </button>
                </div>
            )}

            {/* Step 3: Train Model */}
            {step === 3 && (
                <div style={styles.trainContainer}>
                    <div style={styles.successIcon}>✅</div>
                    <h2>Đăng Ký Khuôn Mặt Thành Công!</h2>

                    <div style={styles.infoCard}>
                        <p><strong>Nhân viên:</strong> {getSelectedUser()?.fullName}</p>
                        <p><strong>Email:</strong> {getSelectedUser()?.email}</p>
                        <p><strong>Trạng thái:</strong> Đã lưu dữ liệu khuôn mặt</p>
                    </div>

                    <div style={styles.warningBox}>
                        <h3>⚠️ Bước Quan Trọng</h3>
                        <p>Bạn cần <strong>huấn luyện mô hình</strong> để hệ thống có thể nhận diện khuôn mặt này.</p>
                        <p>Quá trình này sẽ mất khoảng 10-30 giây.</p>
                    </div>

                    {!result?.modelTrained ? (
                        <button
                            onClick={handleTrainModel}
                            style={styles.trainButton}
                            disabled={loading || !selectedUserId || !result}
                            title={!selectedUserId || !result ? 'Chọn nhân viên và đăng ký khuôn mặt trước khi huấn luyện' : ''}
                        >
                            {loading ? '⏳ Đang Huấn Luyện...' : '🚀 Huấn Luyện Mô Hình'}
                        </button>
                    ) : (
                        <div style={styles.successBox}>
                            <h3>✅ Hoàn Tất!</h3>
                            <p>Mô hình đã được huấn luyện thành công.</p>
                            <p>Nhân viên <strong>{getSelectedUser()?.fullName}</strong> có thể check-in ngay bây giờ!</p>
                        </div>
                    )}

                    <div style={styles.actions}>
                        <button onClick={reset} style={styles.registerAnotherButton}>
                            Đăng Ký Nhân Viên Khác
                        </button>
                        <a href="/attendance/checkin" style={styles.goToCheckinLink}>
                            Đi Đến Check-In
                        </a>
                    </div>
                </div>
            )}

            {loading && (
                <div style={styles.loadingOverlay}>
                    <div style={styles.spinner}></div>
                    <p>Đang xử lý...</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
    },
    title: {
        fontSize: '36px',
        color: '#333',
        marginBottom: '10px',
    },
    subtitle: {
        fontSize: '16px',
        color: '#999',
    },
    progressBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '40px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '10px',
    },
    progressStep: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        opacity: 0.4,
    },
    activeStep: {
        opacity: 1,
    },
    stepNumber: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#4CAF50',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
    },
    progressLine: {
        width: '80px',
        height: '2px',
        backgroundColor: '#ddd',
        margin: '0 10px',
    },
    userListContainer: {
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    sectionTitle: {
        fontSize: '24px',
        marginBottom: '20px',
        color: '#333',
    },
    searchBox: {
        marginBottom: '20px',
    },
    searchInput: {
        width: '100%',
        padding: '12px 20px',
        fontSize: '16px',
        border: '2px solid #ddd',
        borderRadius: '8px',
        outline: 'none',
    },
    userList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '15px',
        maxHeight: '500px',
        overflowY: 'auto',
    },
    userCard: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        border: '2px solid #e0e0e0',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: 'white',
    },
    userAvatar: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: '#4CAF50',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        marginRight: '15px',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '3px',
    },
    userEmail: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '3px',
    },
    userDepartment: {
        fontSize: '12px',
        color: '#999',
    },
    captureContainer: {
        position: 'relative',
    },
    selectedUserBanner: {
        backgroundColor: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    backButton: {
        marginTop: '20px',
        padding: '10px 30px',
        fontSize: '16px',
        backgroundColor: '#9e9e9e',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    trainContainer: {
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    successIcon: {
        fontSize: '72px',
        marginBottom: '20px',
    },
    infoCard: {
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px 0',
        textAlign: 'left',
    },
    warningBox: {
        backgroundColor: '#fff3cd',
        border: '2px solid #ff9800',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '20px',
    },
    trainButton: {
        marginTop: '30px',
        padding: '15px 50px',
        fontSize: '18px',
        fontWeight: 'bold',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    successBox: {
        backgroundColor: '#e8f5e9',
        border: '2px solid #4CAF50',
        borderRadius: '10px',
        padding: '30px',
        marginTop: '20px',
    },
    actions: {
        marginTop: '30px',
        display: 'flex',
        gap: '15px',
        justifyContent: 'center',
    },
    registerAnotherButton: {
        padding: '12px 30px',
        fontSize: '16px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    goToCheckinLink: {
        padding: '12px 30px',
        fontSize: '16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        textDecoration: 'none',
        display: 'inline-block',
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        zIndex: 1000,
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    errorBox: {
        backgroundColor: '#ffebee',
        border: '2px solid #f44336',
        borderRadius: '10px',
        padding: '30px',
        textAlign: 'center',
        marginTop: '20px',
    },
    retryButton: {
        marginTop: '20px',
        padding: '10px 30px',
        fontSize: '16px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
};

// Add spinner animation
const spinnerAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = spinnerAnimation;
    document.head.appendChild(styleSheet);
}

export default RegisterFacePage;
