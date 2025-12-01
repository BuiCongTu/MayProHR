package fpt.aptech.springbootapp.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.dtos.request.UpdateProfileRequest;
import fpt.aptech.springbootapp.dtos.response.ApiResponse;
import fpt.aptech.springbootapp.dtos.response.UserResponseDto;
import fpt.aptech.springbootapp.services.System.UserService;

@RestController
@RequestMapping("/api/user")
public class UserController {

    final private UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUsersByDepartment(@PathVariable Integer deptId) {
        List<UserResponseDto> users = userService.getUsersByDepartment(deptId);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponseDto>> getUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String loginId = authentication.getName(); // Email hoặc phone từ JWT token

        UserResponseDto user = userService.getUserByLoginId(loginId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUserProfile(@RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String loginId = authentication.getName();

        UserResponseDto updatedUser = userService.updateUserProfile(loginId, request);
        return ResponseEntity.ok(ApiResponse.success(updatedUser));
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<ApiResponse<UserResponseDto>> checkDuplicateUser(
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer parentLineId,
            @RequestParam(required = false) Integer lineId,
            @RequestParam(required = false) Integer subLineId,
            @RequestParam Integer roleId) {

        System.out.println("DEBUG: checkDuplicateUser called with: departmentId=" + departmentId
                + ", parentLineId=" + parentLineId + ", lineId=" + lineId
                + ", subLineId=" + subLineId + ", roleId=" + roleId);

        UserResponseDto duplicateUser = userService.findDuplicateUser(
                departmentId, parentLineId, lineId, subLineId, roleId);

        System.out.println("DEBUG: Result - duplicateUser=" + (duplicateUser != null ? duplicateUser.getFullName() : "null"));

        if (duplicateUser != null) {
            return ResponseEntity.ok(ApiResponse.success(duplicateUser));
        } else {
            return ResponseEntity.status(404).body(ApiResponse.error("No duplicate user found"));
        }
    }
}
