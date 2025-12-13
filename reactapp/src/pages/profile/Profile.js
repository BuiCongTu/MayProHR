import {
  Badge as BadgeIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Wc as GenderIcon,
  Timeline as LineIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  Star as SkillIcon,
  CheckCircle as StatusIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/userService';

const Profile = () => {
  const currentUser = getCurrentUser();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const hasSidebar = currentUser?.roleName === 'Admin' || currentUser?.roleName === 'HR';

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();
      // const data = response.data; // LẤY ĐÚNG USER TRONG API

      setUser(response);
      setFormData({
        fullName: response.fullName || '',
        email: response.email || '',
        phone: response.phone || ''
      });

    } catch (err) {
      setError('Không thể tải thông tin người dùng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await updateUserProfile(formData);
      const updatedUser = response.data; // LẤY ĐÚNG USER TRONG API

      setUser(updatedUser);
      setSuccess('Cập nhật thông tin thành công!');
      setEditMode(false);

      // Cập nhật lại localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone
      }));

    } catch (err) {
      setError('Không thể cập nhật thông tin');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarImage = () => {
    const roleName = user?.roleName;
    const gender = user?.gender;

    if (roleName === 'Admin') return '/images/admin.jpeg';
    if (roleName === 'HR') return '/images/hr.jpeg';
    if (roleName === 'Manager') return '/images/manager.jpeg';
    if (roleName === 'Factory Manager' || roleName === 'FManager') return '/images/fmanager.jpeg';
    if (roleName === 'Factory Director' || roleName === 'FDirector') return '/images/fdirector.jpeg';

    if (gender === false || gender === 0) return '/images/female.jpeg';
    if (gender === true || gender === 1) return '/images/male.jpeg';

    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const avatarImage = getAvatarImage();

  const ProfileContent = (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Thông tin cá nhân</Typography>
          {!editMode && (
            <Button variant="contained" startIcon={<EditIcon />} sx={{ backgroundColor: '#4b90f9ff' }}
              onClick={handleEdit}>
              Chỉnh sửa
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Avatar src={avatarImage} sx={{ width: 120, height: 120, fontSize: '3rem' }}>
            {!avatarImage && (user?.fullName?.charAt(0) || 'U')}
          </Avatar>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Các trường hiển thị user thông tin giữ nguyên như bạn đã viết */}
        {/* Không thay đổi UI bên dưới → Mọi thứ đã chạy đúng */}


        {/* Profile Information */}
        <Grid container spacing={3}>
          {/* Full Name */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Họ và tên
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.fullName || 'N/A'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.email || 'N/A'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Phone */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhoneIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Số điện thoại
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.phone || 'N/A'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Role */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BadgeIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Vai trò
                </Typography>
                <Typography variant="body1">
                  {user?.roleName || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Department */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Phòng ban
                </Typography>
                <Typography variant="body1">
                  {user?.departmentName || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Line */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LineIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Chuyền
                </Typography>
                <Typography variant="body1">
                  {user?.lineName || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Skill Level */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SkillIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Trình độ kỹ năng
                </Typography>
                <Typography variant="body1">
                  {user?.skillLevelName || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Salary Type */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WorkIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Loại lương
                </Typography>
                <Typography variant="body1">
                  {user?.salaryType === 'TimeBased' ? 'Theo thời gian' : user?.salaryType === 'ProductBased' ? 'Theo sản phẩm' : user?.salaryType || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Base Salary */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Lương cơ bản
                </Typography>
                <Typography variant="body1">
                  {user?.baseSalary ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.baseSalary) : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Hire Date */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Ngày vào làm
                </Typography>
                <Typography variant="body1">
                  {user?.hireDate ? new Date(user.hireDate).toLocaleDateString('vi-VN') : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Gender */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <GenderIcon sx={{ mr: 2, color: '#4b90f9ff' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Giới tính
                </Typography>
                <Typography variant="body1">
                  {user?.gender === true ? 'Nam' : user?.gender === false ? 'Nữ' : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Status */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StatusIcon sx={{ mr: 2, color: user?.status === 'Active' ? '#4caf50' : '#f44336' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái
                </Typography>
                <Typography variant="body1" sx={{ color: user?.status === 'Active' ? '#4caf50' : '#f44336' }}>
                  {user?.status === 'Active' ? 'Đang làm việc' : user?.status === 'Inactive' ? 'Ngưng làm việc' : user?.status || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Action Buttons for Edit Mode */}
        {editMode && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ backgroundColor: '#4b90f9ff' }}
            >
              {saving ? <CircularProgress size={24} /> : 'Lưu'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );

  // Nếu có sidebar (Admin/HR), wrap content với Box flex
  if (hasSidebar)
  {
    return (
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        {ProfileContent}
      </Box>
    );
  }

  // Nếu không có sidebar, return trực tiếp content
  return ProfileContent;
};

export default Profile;
