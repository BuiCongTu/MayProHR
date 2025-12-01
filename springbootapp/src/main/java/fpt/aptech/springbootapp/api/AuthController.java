package fpt.aptech.springbootapp.api;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.dtos.request.Auth.ChangePassReq;
import fpt.aptech.springbootapp.dtos.request.Auth.ForgotPasswordReq;
import fpt.aptech.springbootapp.dtos.request.Auth.LoginReq;
import fpt.aptech.springbootapp.dtos.request.Auth.RegisterReq;
import fpt.aptech.springbootapp.dtos.request.Auth.ResetPasswordReq;
import fpt.aptech.springbootapp.dtos.request.Auth.VerifyTokenReq;
import fpt.aptech.springbootapp.dtos.response.ApiResponse;
import fpt.aptech.springbootapp.dtos.response.LoginResponse;
import fpt.aptech.springbootapp.dtos.response.UserResponseDto;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.securities.JwtUtils;
import fpt.aptech.springbootapp.services.System.UserService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private JwtUtils jwtUtils;
    private UserService userService;

    @Autowired
    public AuthController(
            JwtUtils jwtUtils,
            UserService userService) {
        this.jwtUtils = jwtUtils;
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginReq request) {
        try {
            LoginResponse loginResponse = userService.login(request);
            return ResponseEntity.ok(ApiResponse.success("Login successful", loginResponse));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(@Valid @RequestBody RegisterReq request) {
        try {
            // check quyền
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUserEmail = authentication != null ? authentication.getName() : null;

            if (request.getVerificationMethod() == null || request.getVerificationMethod().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Verification method (EMAIL or PHONE) is required"));
            }

            String token = userService.register(request, currentUserEmail);
            Map<String, String> response = new java.util.HashMap<>();
            response.put("token", token);
            response.put("message", "Registration initiated. Please verify your " + request.getVerificationMethod().toLowerCase());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration initiated", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<String>> verifyRegistration(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            String otp = request.get("otp");

            if (token == null || token.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Token is required"));
            }

            if (otp == null || otp.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("OTP is required"));
            }

            userService.verifyRegistration(token, otp);
            return ResponseEntity.ok(ApiResponse.success("Verification successful", null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/getallemp")
    public ResponseEntity<ApiResponse<List<TbUser>>> getAllEmployees() {
        try {
            List<TbUser> users = userService.findAllUsers();
            return ResponseEntity.ok(ApiResponse.success(users));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/getemp/{phone}")
    public ResponseEntity<ApiResponse<UserResponseDto>> getUserByPhone(@PathVariable String phone) {
        try {
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Phone cannot be empty"));
            }

            UserResponseDto user = userService.getUserByPhone(phone);
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/updateuser/{phone}")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUser(
            @PathVariable String phone,
            @RequestBody TbUser userUpdate) {
        try {
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Phone cannot be empty"));
            }

            if (userUpdate == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("User update data cannot be null"));
            }

            TbUser existingUser = userService.findByPhone(phone)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // ko cập nhật password và email)
            if (userUpdate.getFullName() != null) {
                existingUser.setFullName(userUpdate.getFullName());
            }
            if (userUpdate.getPhone() != null) {
                existingUser.setPhone(userUpdate.getPhone());
            }
            if (userUpdate.getRole() != null) {
                existingUser.setRole(userUpdate.getRole());
            }
            if (userUpdate.getDepartment() != null) {
                existingUser.setDepartment(userUpdate.getDepartment());
            }
            if (userUpdate.getLine() != null) {
                existingUser.setLine(userUpdate.getLine());
            }
            if (userUpdate.getSkillLevel() != null) {
                existingUser.setSkillLevel(userUpdate.getSkillLevel());
            }
            if (userUpdate.getSalaryType() != null) {
                existingUser.setSalaryType(userUpdate.getSalaryType());
            }
            if (userUpdate.getBaseSalary() != null) {
                existingUser.setBaseSalary(userUpdate.getBaseSalary());
            }
            if (userUpdate.getHireDate() != null) {
                existingUser.setHireDate(userUpdate.getHireDate());
            }
            if (userUpdate.getStatus() != null) {
                existingUser.setStatus(userUpdate.getStatus());
            }

            TbUser updatedUser = userService.createOrUpdateUser(existingUser);
            UserResponseDto userResponse = userService.getUserByPhone(updatedUser.getPhone());

            return ResponseEntity.ok(ApiResponse.success("Update successful", userResponse));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Update Error: " + e.getMessage()));
        }
    }

    //lay thong tin user hiện tại từ JWT token
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String phone = authentication.getName();

            UserResponseDto user = userService.getUserByPhone(phone);
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @RequestParam String email,
            @Valid @RequestBody ChangePassReq request) {
        try {
            userService.changePassword(email, request);
            return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordReq request) {
        try {
            if (request.getEmailOrPhone() == null || request.getEmailOrPhone().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Email or Phone is required"));
            }

            if (request.getVerificationMethod() == null || request.getVerificationMethod().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Verification method (EMAIL or PHONE) is required"));
            }

            String token = userService.forgotPassword(request.getEmailOrPhone(), request.getVerificationMethod());
            return ResponseEntity.ok(
                    ApiResponse.success("OTP sent to your " + request.getVerificationMethod().toLowerCase(), token));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody ResetPasswordReq request) {
        try {
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Token is required"));
            }

            if (request.getOtp() == null || request.getOtp().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("OTP is required"));
            }

            if (!request.getNewPassword().equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Passwords do not match"));
            }

            userService.resetPassword(request.getToken(), request.getOtp(), request.getNewPassword());
            return ResponseEntity.ok(
                    ApiResponse.success("Password reset successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<ApiResponse<UserResponseDto>> verifyRegistration(@Valid @RequestBody VerifyTokenReq request) {
        try {
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Token is required"));
            }

            if (request.getOtp() == null || request.getOtp().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("OTP is required"));
            }

            userService.verifyRegistration(request.getToken(), request.getOtp());
            return ResponseEntity.ok(
                    ApiResponse.success("Registration verified successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

}
