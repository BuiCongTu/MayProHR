class ApiConfig {
  // Cấu hình URL backend
  //static const String baseUrl = 'http://192.168.2.14:9999';
  // static const String baseUrl = 'http://172.16.3.234:9999';

  //Phu fixed url
  static const String baseUrl = 'http://100.69.135.59:9999';

  // API Timeouts (milliseconds)
  static const int connectionTimeout = 10000;
  static const int receiveTimeout = 10000;
  static const int sendTimeout = 10000;

  // API Endpoints
  static const String loginEndpoint = '/api/auth/login';
  static const String registerEndpoint = '/api/auth/register';
  static const String logoutEndpoint = '/api/auth/logout';
  static const String getCurrentUserEndpoint = '/api/auth/me';
  static const String getUserByPhoneEndpoint = '/api/auth/getemp';
  static const String getAllEmployeesEndpoint = '/api/auth/getallemp';
  static const String updateUserEndpoint = '/api/auth/updateuser';
  static const String changePasswordEndpoint = '/api/auth/change-password';
  static const String forgotPasswordEndpoint = '/api/auth/forgot-password';
  static const String resetPasswordEndpoint = '/api/auth/reset-password';

  // Payroll Endpoints
  static const String payHisEndpoint = '$baseUrl/api/payroll/employee';
  static const String payrollAvailableYearsEndpoint = '/api/payroll/employee/available-years';
  static const String payrollAvailableMonthsEndpoint = '/api/payroll/employee/available-months';

  //employee overtime response
  static const String myOvertimeEndpoint = '/api/app/overtime/my-invites';
  static const String respondOvertimeEndpoint = '/api/app/overtime/respond';
  static const String updateDeviceTokenEndpoint = '/api/users/device-token';
}
