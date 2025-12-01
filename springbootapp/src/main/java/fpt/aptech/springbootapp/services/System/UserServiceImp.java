package fpt.aptech.springbootapp.services.System;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fpt.aptech.springbootapp.dtos.request.Auth.ChangePassReq;
import fpt.aptech.springbootapp.dtos.request.Auth.LoginReq;
import fpt.aptech.springbootapp.dtos.request.Auth.RegisterReq;
import fpt.aptech.springbootapp.dtos.request.UpdateProfileRequest;
import fpt.aptech.springbootapp.dtos.response.LoginResponse;
import fpt.aptech.springbootapp.dtos.response.UserResponseDto;
import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbRole;
import fpt.aptech.springbootapp.entities.Core.TbSkillLevel;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.System.TbPasswordResetToken;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.RoleRepository;
import fpt.aptech.springbootapp.repositories.SkillLevelRepo;
import fpt.aptech.springbootapp.repositories.System.PassResetTokenRepo;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.securities.JwtUtils;

@Service
public class UserServiceImp implements UserService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final DepartmentRepository deptRepo;
    private final LineRepository lineRepo;
    private final SkillLevelRepo skillLevelRepo;
    private final PassResetTokenRepo passResetTokenRepo;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Autowired
    public UserServiceImp(
            UserRepository userRepo,
            RoleRepository roleRepo,
            DepartmentRepository deptRepo,
            LineRepository lineRepo,
            SkillLevelRepo skillLevelRepo,
            PassResetTokenRepo passResetTokenRepo,
            JwtUtils jwtUtils,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.deptRepo = deptRepo;
        this.lineRepo = lineRepo;
        this.skillLevelRepo = skillLevelRepo;
        this.passResetTokenRepo = passResetTokenRepo;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public String register(RegisterReq registerReq, String currentUserEmail) {
        if (currentUserEmail != null && !currentUserEmail.isEmpty()) {
            Optional<TbUser> currentUserOpt = userRepo.findByEmail(currentUserEmail);
            if (currentUserOpt.isPresent()) {
                TbUser currentUser = currentUserOpt.get();
                String currentUserRole = currentUser.getRole().getName();
                String requestedRoleName = roleRepo.findById(registerReq.getRoleId())
                        .map(TbRole::getName)
                        .orElse("Unknown");

                if (!hasPermissionToRegisterRole(currentUserRole, requestedRoleName)) {
                    throw new RuntimeException("Permission denied: You cannot register a user with role '" + requestedRoleName + "'");
                }
            }
        }

        if (userRepo.findByEmail(registerReq.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        if (userRepo.findByPhone(registerReq.getPhone()).isPresent()) {
            throw new RuntimeException("Phone already exists");
        }

        //load data
        TbRole role = roleRepo.findById(registerReq.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        TbDepartment dept = deptRepo.findById(registerReq.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found with ID: " + registerReq.getDepartmentId()));
        TbLine line = null;
        if (registerReq.getLineId() != null) {
            line = lineRepo.findById(registerReq.getLineId())
                    .orElseThrow(() -> new RuntimeException("Line not found with ID: " + registerReq.getLineId()));
        }
        TbSkillLevel skillLevel = null;
        if (registerReq.getSkillLevelId() != null) {
            Optional<TbSkillLevel> optSkill = skillLevelRepo.findById(registerReq.getSkillLevelId());
            if (optSkill.isPresent()) {
                skillLevel = optSkill.get();
            } else {
                throw new RuntimeException("SkillLevel not found with ID: " + registerReq.getSkillLevelId());
            }
        }

        TbUser user = new TbUser();
        user.setFullName(registerReq.getFullName());
        user.setEmail(registerReq.getEmail());
        user.setPhone(registerReq.getPhone());
        user.setPasswordHash(passwordEncoder.encode(registerReq.getPassword())); // Hash password
        user.setRole(role);
        user.setDepartment(dept);
        user.setLine(line);
        user.setSkillLevel(skillLevel);
        user.setStatus(TbUser.UserStatus.Active);
        user.setGender(false);
        user.setCreatedAt(Instant.now());

        if (registerReq.getSalaryType() != null) {
            try {
                user.setSalaryType(TbUser.SalaryType.valueOf(registerReq.getSalaryType()));
            } catch (IllegalArgumentException e) {
                user.setSalaryType(TbUser.SalaryType.TimeBased);
            }
        } else {
            user.setSalaryType(TbUser.SalaryType.TimeBased);
        }

        if (registerReq.getBaseSalary() != null) {
            user.setBaseSalary(registerReq.getBaseSalary());
        }
        if (registerReq.getHireDate() != null) {
            user.setHireDate(registerReq.getHireDate());
        }

        user.setStatus(TbUser.UserStatus.Active);
        user.setCreatedAt(Instant.now());

        // Save
        TbUser savedUser = userRepo.save(user);

        // Tạo verification token
        String token = UUID.randomUUID().toString();
        String otp = String.format("%06d", new Random().nextInt(1000000));

        String contactValue = registerReq.getVerificationMethod() != null
                && registerReq.getVerificationMethod().equalsIgnoreCase("PHONE")
                ? registerReq.getPhone()
                : registerReq.getEmail();

        String verificationType = registerReq.getVerificationMethod() != null
                && registerReq.getVerificationMethod().equalsIgnoreCase("PHONE")
                ? "PHONE"
                : "EMAIL";

        TbPasswordResetToken verificationToken = new TbPasswordResetToken();
        verificationToken.setUser(savedUser);
        verificationToken.setToken(token);
        verificationToken.setOtp(otp);
        verificationToken.setVerificationType("REGISTRATION");
        verificationToken.setContactValue(contactValue);
        verificationToken.setExpiryDate(Instant.now().plus(Duration.ofHours(24)));
        verificationToken.setUsed(false);
        passResetTokenRepo.save(verificationToken);
        //goi qua email hoac phone
        try {
            if (verificationType.equals("EMAIL")) {
                emailService.sendOtpEmail(registerReq.getEmail(), otp, registerReq.getFullName());
            } else if (verificationType.equals("PHONE")) {
                emailService.sendSmsOtp(registerReq.getPhone(), otp);
            }
        } catch (Exception e) {
            System.out.println("Failed to send OTP: " + e.getMessage());

        }
        // Return token
        System.out.println("User registered successfully: " + savedUser.getId());
        return token;
    }

    private boolean hasPermissionToRegisterRole(String currentUserRole, String targetRole) {
        // Admin can register anyone except Admin
        if ("Admin".equals(currentUserRole)) {
            return !"Admin".equals(targetRole);
        }

        // HR can only register specific roles
        if ("HR".equals(currentUserRole)) {
            return targetRole.matches("Factory Manager|Manager|Leader|Assistant Leader|Worker");
        }

        // Admin can create Factory Director
        if ("Factory Director".equals(currentUserRole)) {
            return false;
        }

        return false;
    }

    @Override
    @Transactional
    public void verifyRegistration(String token, String otp) {
        TbPasswordResetToken verificationToken = passResetTokenRepo.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (verificationToken.isExpired()) {
            throw new RuntimeException("Verification token has expired");
        }

        if (verificationToken.getUsed()) {
            throw new RuntimeException("Verification token already used");
        }

        if (!"REGISTRATION".equals(verificationToken.getVerificationType())) {
            throw new RuntimeException("Invalid verification type");
        }
        // xac nhan Otp
        //compare voi otp trong db
        if (otp != null && !otp.trim().isEmpty()) {
            if (!otp.equals(verificationToken.getOtp())) {
                throw new RuntimeException("Invalid OTP");
            }
        }
        verificationToken.setUsed(true);
        passResetTokenRepo.save(verificationToken);

    }

    @Override
    public TbUser createOrUpdateUser(TbUser user) {
        if (user.getId() == null) {
            TbRole userRole = roleRepo.findByName("USER")
                    .orElseGet(() -> roleRepo.save(new TbRole(null, "USER", "Default user role", null)));
            user.setRole(userRole);
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
            user.setCreatedAt(Instant.now());
            user.setStatus(TbUser.UserStatus.Active);
        }
        return userRepo.save(user);
    }

    @Override
    public LoginResponse login(LoginReq loginReq) {
        // Tìm user bằng email hoặc phone
        TbUser user = null;
        String loginId = loginReq.getLoginId();

        //loginId có phải là email không?
        if (loginId.contains("@")) {
            user = userRepo.findByEmail(loginId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        } else {
            user = userRepo.findByPhone(loginId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }

        if (!passwordEncoder.matches(loginReq.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Generate token với phone hoặc email
        String tokenSubject = user.getEmail() != null ? user.getEmail() : user.getPhone();
        String token = jwtUtils.generateToken(tokenSubject, user.getRole().getName());

        UserResponseDto userDto = buildUserResponseDto(user);

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(userDto)
                .build();

    }

    //Anh Tú có thể dùng UserMapper - ddúng zị, dùng nào cũng đc
    private UserResponseDto buildUserResponseDto(TbUser user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(user.getRole() != null ? user.getRole().getName() : null)
                .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
                .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
                .lineId(user.getLine() != null ? user.getLine().getId() : null)
                .lineName(user.getLine() != null ? user.getLine().getName() : null)
                .skillLevelId(user.getSkillLevel() != null ? user.getSkillLevel().getId() : null)
                .skillLevelName(user.getSkillLevel() != null ? user.getSkillLevel().getName() : null)
                .salaryType(user.getSalaryType())
                .baseSalary(user.getBaseSalary())
                .hireDate(user.getHireDate())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    public Optional<TbUser> findByPhone(String phone) {
        return userRepo.findByPhone(phone);
    }

    @Override
    public Optional<TbUser> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    @Override
    public UserResponseDto getUserByPhone(String phone) {
        TbUser user = userRepo.findByPhone(phone)
                .orElseThrow(() -> new RuntimeException("Not found employee: " + phone));

        return buildUserResponseDto(user);
    }

    @Override
    public UserResponseDto getUserByLoginId(String loginId) {
        TbUser user;
        if (loginId.contains("@")) {
            // Login with email
            user = userRepo.findByEmail(loginId)
                    .orElseThrow(() -> new RuntimeException("Not found employee: " + loginId));
        } else {
            // Login with phone
            user = userRepo.findByPhone(loginId)
                    .orElseThrow(() -> new RuntimeException("Not found employee: " + loginId));
        }

        return buildUserResponseDto(user);
    }

    @Override
    public List<TbUser> findAllUsers() {
        return userRepo.findAll();
    }

    @Override
    public void changePassword(String phone, ChangePassReq request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        TbUser user = userRepo.findByPhone(phone)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Old password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepo.save(user);
    }

    @Override
    @Transactional
    public String forgotPassword(String emailOrPhone, String verificationMethod) {
        TbUser user = null;
        String contactValue = emailOrPhone;

        if (verificationMethod.equalsIgnoreCase("EMAIL")) {
            user = userRepo.findByEmail(emailOrPhone)
                    .orElseThrow(() -> new RuntimeException("User with email not found"));
        } else if (verificationMethod.equalsIgnoreCase("PHONE")) {
            user = userRepo.findByPhone(emailOrPhone)
                    .orElseThrow(() -> new RuntimeException("User with phone not found"));
        } else {
            throw new RuntimeException("Invalid verification method");
        }

        // xoá token cũ
        passResetTokenRepo.deleteOldTokenByUser(user);

        // tao reset token moi
        String newToken = UUID.randomUUID().toString();
        String newOtp = String.format("%06d", new Random().nextInt(1000000));

        // Save token to database with expiration time
        TbPasswordResetToken resetToken = new TbPasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(newToken);
        resetToken.setOtp(newOtp);
        resetToken.setVerificationType("PASSWORD_RESET");
        resetToken.setContactValue(contactValue);
        resetToken.setExpiryDate(Instant.now().plus(Duration.ofMinutes(10)));
        resetToken.setUsed(false);
        resetToken.setCreatedAt(Instant.now());

        passResetTokenRepo.save(resetToken);
        try {
            if (verificationMethod.equalsIgnoreCase("EMAIL")) {
                emailService.sendOtpEmail(user.getEmail(), newOtp, user.getFullName());
            } else if (verificationMethod.equalsIgnoreCase("PHONE")) {
                emailService.sendSmsOtp(user.getPhone(), newOtp);
            }
        } catch (Exception e) {
            System.out.println("Failed to send OTP: " + e.getMessage());
        }

        return newToken;
    }

    @Override
    @Transactional
    public void resetPassword(String token, String otp, String newPassword) {

        TbPasswordResetToken resetToken = passResetTokenRepo.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid reset token"));

        if (resetToken.isExpired()) {
            throw new RuntimeException("Reset token has expired");
        }

        if (resetToken.getUsed()) {
            throw new RuntimeException("Reset token already used");
        }

        if (!"PASSWORD_RESET".equals(resetToken.getVerificationType())) {
            throw new RuntimeException("Invalid token type");
        }
        if (otp != null && !otp.trim().isEmpty()) {
            if (!otp.equals(resetToken.getOtp())) {
                throw new RuntimeException("Invalid OTP");
            }
        }

        TbUser user = resetToken.getUser();
        // Update password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        resetToken.setUsed(true);
        passResetTokenRepo.save(resetToken);
        System.out.println("Password reset successfully");
    }

    @Override
    public List<UserResponseDto> getUsersByDepartment(Integer departmentId) {
        List<TbUser> users = userRepo.findByDepartmentIdAndRoleName(departmentId, "Worker");
        return users.stream()
                .map(this::buildUserResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserResponseDto updateUserProfile(String loginId, UpdateProfileRequest request) {
        TbUser user;
        if (loginId.contains("@")) {
            // Login with email
            user = userRepo.findByEmail(loginId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        } else {
            // Login with phone
            user = userRepo.findByPhone(loginId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }

        // Update fields
        if (request.getFullName() != null && !request.getFullName().isEmpty()) {
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            // Check if new phone already exists
            Optional<TbUser> existingUser = userRepo.findByPhone(request.getPhone());
            if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                throw new RuntimeException("Phone number already exists");
            }
            user.setPhone(request.getPhone());
        }

        TbUser savedUser = userRepo.save(user);
        return buildUserResponseDto(savedUser);
    }

    @Override
    public UserResponseDto findDuplicateUser(Integer departmentId, Integer parentLineId, Integer lineId,
            Integer subLineId, Integer roleId) {
        TbRole role = roleRepo.findById(roleId).orElse(null);
        if (role == null) {
            System.out.println("DEBUG: Role not found for roleId=" + roleId);
            return null;
        }

        String roleName = role.getName();
        System.out.println("DEBUG: findDuplicateUser - roleName=" + roleName + ", departmentId=" + departmentId);
        List<TbUser> usersWithRole;

        // Factory Director
        if ("Factory Director".equals(roleName)) {
            System.out.println("DEBUG: Checking Factory Director");
            usersWithRole = userRepo.findAll().stream()
                    .filter(u -> u.getRole() != null && u.getRole().getId().equals(roleId))
                    .collect(Collectors.toList());
            System.out.println("DEBUG: Found " + usersWithRole.size() + " Factory Director users");
            if (!usersWithRole.isEmpty()) {
                System.out.println("DEBUG: Returning first Factory Director: " + usersWithRole.get(0).getFullName());
                return buildUserResponseDto(usersWithRole.get(0));
            }
            return null;
        }

        // HR
        if ("HR".equals(roleName)) {
            System.out.println("DEBUG: Checking HR");
            usersWithRole = userRepo.findAll().stream()
                    .filter(u -> u.getRole() != null && u.getRole().getId().equals(roleId))
                    .collect(Collectors.toList());
            System.out.println("DEBUG: Found " + usersWithRole.size() + " HR users");
            if (!usersWithRole.isEmpty()) {
                System.out.println("DEBUG: Returning first HR: " + usersWithRole.get(0).getFullName());
                return buildUserResponseDto(usersWithRole.get(0));
            }
            return null;
        }

        if ("Factory Manager".equals(roleName)) {
            System.out.println("DEBUG: Checking Factory Manager with departmentId=" + departmentId);
            usersWithRole = userRepo.findAll().stream()
                    .filter(u -> u.getRole() != null && u.getRole().getId().equals(roleId)
                            && u.getDepartment() != null && u.getDepartment().getId().equals(departmentId))
                    .collect(Collectors.toList());
            System.out.println("DEBUG: Found " + usersWithRole.size() + " Factory Manager users in this department");
            if (!usersWithRole.isEmpty()) {
                System.out.println("DEBUG: Returning first Factory Manager: " + usersWithRole.get(0).getFullName());
                return buildUserResponseDto(usersWithRole.get(0));
            }
            return null;
        }


        // Các role khác
        usersWithRole = userRepo.findAll().stream()
                .filter(u -> u.getRole() != null && u.getRole().getId().equals(roleId)
                && u.getDepartment() != null && u.getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());

        for (TbUser user : usersWithRole) {

            if ("Manager".equals(roleName) && parentLineId != null) {
                if (user.getLine() != null && user.getLine().getId().equals(parentLineId)) {
                    return buildUserResponseDto(user);
                }
            } else if (("Leader".equals(roleName) || "Assistant Leader".equals(roleName)) && lineId != null) {
                if (user.getLine() != null && user.getLine().getId().equals(lineId)) {
                    return buildUserResponseDto(user);
                }
            } // Worker không kiểm tra duplicate
            else if ("Worker".equals(roleName)) {
                continue;
            } else if ("Admin".equals(roleName)) {
                return buildUserResponseDto(user);
            }
        }

        return null;
    }
}
