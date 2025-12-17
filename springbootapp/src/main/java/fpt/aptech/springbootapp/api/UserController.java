package fpt.aptech.springbootapp.api;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import fpt.aptech.springbootapp.dtos.request.DeviceTokenReq;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
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
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.System.UserService;
import fpt.aptech.springbootapp.services.interfaces.LineService;

@RestController
@RequestMapping("/api/user")
public class UserController {

    final private UserService userService;
    final private UserRepository userRepository;
    final private LineService lineService;
    final private LineRepository lineRepository;

    @Autowired
    public UserController(UserService userService, UserRepository userRepository, LineService lineService, LineRepository lineRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.lineService = lineService;
        this.lineRepository = lineRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TbUser>>> getAllUsers() {
        List<TbUser> users = userRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success(users));
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

    @PostMapping("/device-token")
    @Transactional
    public ResponseEntity<?> updateDeviceToken(@RequestBody DeviceTokenReq req) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TbUser currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("User not found"));
        }
        String newToken = req.getToken();

        List<TbUser> previousOwner = userRepository.findByDeviceToken(newToken);
        for (TbUser owner : previousOwner) {
            if(!owner.getId().equals(currentUser.getId())){
                owner.setDeviceToken(null);
                userRepository.save(owner);
                System.out.println("DEBUG: Remove device token for user " + owner.getFullName());
            }
        }

        currentUser.setDeviceToken(newToken);
        userRepository.save(currentUser);
        //userService.saveDeviceToken(email, req.getToken());
        return ResponseEntity.ok().body(Map.of("message", "Token updated"));
    }
    //role_id, department_id and hierarchical line ids
    //department + line; department + line + subline;
    // department + line + subline + wordUnit
    @GetMapping("/search-by-structure")
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> searchEmployeesByStructure(
            @RequestParam Integer departmentId,
            @RequestParam(required = false) Integer lineId,
            @RequestParam(required = false) Integer subLineId,
            @RequestParam(required = false) Integer wordUnitId,
            @RequestParam(required = false) Integer roleId) {

        Integer targetLineId = null;
        if (wordUnitId != null) {
            targetLineId = wordUnitId;
        } else if (subLineId != null) {
            targetLineId = subLineId;
        } else if (lineId != null) {
            targetLineId = lineId;
        }

        List<TbUser> users = userRepository.findByDepartmentId(departmentId);

        if (targetLineId != null) {
            List<Integer> descendantIds = lineService.getAllDescendantIds(targetLineId);
            Set<Integer> allowedLineIds = descendantIds.stream().collect(Collectors.toSet());
            allowedLineIds.add(targetLineId);
            users = users.stream()
                    .filter(u -> u.getLine() != null && allowedLineIds.contains(u.getLine().getId()))
                    .collect(Collectors.toList());
        }

        if (roleId != null) {
            users = users.stream()
                    .filter(u -> u.getRole() != null && roleId.equals(u.getRole().getId()))
                    .collect(Collectors.toList());
        }

        // Map to lightweight DTO for FE
        List<UserResponseDto> dtos = users.stream().map(u -> {
            UserResponseDto dto = new UserResponseDto();
            dto.setId(u.getId());
            dto.setFullName(u.getFullName());
            dto.setEmail(u.getEmail());
            dto.setPhone(u.getPhone());
            dto.setRoleId(u.getRole() != null ? u.getRole().getId() : null);
            dto.setRoleName(u.getRole() != null ? u.getRole().getName() : null);
            dto.setDepartmentId(u.getDepartment() != null ? u.getDepartment().getId() : null);
            dto.setDepartmentName(u.getDepartment() != null ? u.getDepartment().getName() : null);
            dto.setSalaryType(u.getSalaryType());

            Integer lineIdVal = null;
            String lineNameVal = null;
            Integer subLineIdVal = null;
            String subLineNameVal = null;
            Integer workUnitIdVal = null;
            String workUnitNameVal = null;

            TbLine cur = u.getLine();
            if (cur != null) {
                TbLine parent = cur.getParent();
                TbLine grandParent = (parent != null) ? parent.getParent() : null;
                Integer lvl = cur.getLevel();

                if (lvl != null) {
                    switch (lvl) {
                        case 5: // Work Unit
                            workUnitIdVal = cur.getId();
                            workUnitNameVal = cur.getName();
                            subLineIdVal = (parent != null) ? parent.getId() : null;
                            subLineNameVal = (parent != null) ? parent.getName() : null;
                            lineIdVal = (grandParent != null) ? grandParent.getId() : null;
                            lineNameVal = (grandParent != null) ? grandParent.getName() : null;
                            break;
                        case 4: // Sub Line
                            workUnitIdVal = null;
                            workUnitNameVal = null;
                            subLineIdVal = cur.getId();
                            subLineNameVal = cur.getName();
                            lineIdVal = (parent != null) ? parent.getId() : null;
                            lineNameVal = (parent != null) ? parent.getName() : null;
                            break;
                        case 3: // Line
                            workUnitIdVal = null;
                            workUnitNameVal = null;
                            subLineIdVal = null;
                            subLineNameVal = null;
                            lineIdVal = cur.getId();
                            lineNameVal = cur.getName();
                            break;
                        default:
                            workUnitIdVal = null;
                            workUnitNameVal = null;
                            subLineIdVal = null;
                            subLineNameVal = null;
                            lineIdVal = cur.getId();
                            lineNameVal = cur.getName();
                            break;
                    }
                } else {
                    // Fallback by ancestry depth when level is missing
                    if (parent == null) {
                        lineIdVal = cur.getId();
                        lineNameVal = cur.getName();
                    } else if (grandParent == null) {
                        subLineIdVal = cur.getId();
                        subLineNameVal = cur.getName();
                        lineIdVal = parent.getId();
                        lineNameVal = parent.getName();
                    } else {
                        workUnitIdVal = cur.getId();
                        workUnitNameVal = cur.getName();
                        subLineIdVal = parent.getId();
                        subLineNameVal = parent.getName();
                        lineIdVal = grandParent.getId();
                        lineNameVal = grandParent.getName();
                    }
                }
            }

            dto.setLineId(lineIdVal);
            dto.setLineName(lineNameVal);
            dto.setSubLineId(subLineIdVal);
            dto.setSubLineName(subLineNameVal);
            dto.setWorkUnitId(workUnitIdVal);
            dto.setWorkUnitName(workUnitNameVal);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PostMapping("/remove-device-token")
    public ResponseEntity<?> removeDeviceToken() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TbUser currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser != null) {
            currentUser.setDeviceToken(null);
            userRepository.save(currentUser);
            return ResponseEntity.ok().body(Map.of("message", "Token removed"));
        }
        return ResponseEntity.status(401).body(Map.of("message", "User not found"));
    }
}
