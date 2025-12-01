package fpt.aptech.springbootapp.services.System;

import java.util.List;
import java.util.Optional;

import fpt.aptech.springbootapp.dtos.request.Auth.ChangePassReq;
import fpt.aptech.springbootapp.dtos.request.Auth.LoginReq;
import fpt.aptech.springbootapp.dtos.request.Auth.RegisterReq;
import fpt.aptech.springbootapp.dtos.request.UpdateProfileRequest;
import fpt.aptech.springbootapp.dtos.response.LoginResponse;
import fpt.aptech.springbootapp.dtos.response.UserResponseDto;
import fpt.aptech.springbootapp.entities.Core.TbUser;

public interface UserService {

    // Auth methods
    LoginResponse login(LoginReq loginReq);

    String register(RegisterReq registerReq, String currentUserEmail);

    void verifyRegistration(String token, String otp);

    // User CRUD
    TbUser createOrUpdateUser(TbUser user);

    Optional<TbUser> findByPhone(String phone);

    Optional<TbUser> findByEmail(String email);

    UserResponseDto getUserByPhone(String phone);

    List<TbUser> findAllUsers();

    // Password management
    void changePassword(String phone, ChangePassReq request);

    String forgotPassword(String emailOrPhone, String verificationMethod);

    void resetPassword(String token, String otp, String newPassword);

    List<UserResponseDto> getUsersByDepartment(Integer departmentId);

    // Profile management
    UserResponseDto getUserByLoginId(String loginId);

    UserResponseDto updateUserProfile(String loginId, UpdateProfileRequest request);

    UserResponseDto findDuplicateUser(Integer departmentId, Integer parentLineId, Integer lineId, Integer subLineId, Integer roleId);
}
