package fpt.aptech.springbootapp.dtos.response;

import fpt.aptech.springbootapp.entities.Core.TbUser.SalaryType;
import fpt.aptech.springbootapp.entities.Core.TbUser.UserStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class UserResponseDto {
    private Integer id;
    private String fullName;
    private String email;
    private String phone;
    private Boolean gender;

    private Integer roleId;
    private String roleName;

    private Integer departmentId;
    private String departmentName;

    private Integer lineId;
    private String lineName;

    private Integer subLineId;
    private String subLineName;

    private Integer workUnitId;
    private String workUnitName;

    private Integer skillLevelId;
    private String skillLevelName;

    private SalaryType salaryType;
    private BigDecimal baseSalary;
    private LocalDate hireDate;
    private UserStatus status;
    private Instant createdAt;

}
