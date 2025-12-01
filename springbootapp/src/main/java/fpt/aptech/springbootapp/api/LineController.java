package fpt.aptech.springbootapp.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.dtos.response.ApiResponse;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.services.interfaces.LineService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/lines")
public class LineController {

    private final LineService lineService;

    @Autowired
    public LineController(LineService lineService) {
        this.lineService = lineService;
    }

    //lấy tất cả section, subsection, ... của 1 department
    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<TbLine>> getLinesByDepartment(@PathVariable Integer deptId) {
        try {
            List<TbLine> lines = lineService.getLinesByDepartment(deptId);
            return ResponseEntity.ok(lines);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    //lay tat ca theo department_id
    @GetMapping("/root/{departmentId}")
    public ResponseEntity<ApiResponse<List<TbLine>>> getRootLines(
            @PathVariable Integer departmentId) {
        try {
            log.info("Request: Get root lines for department {}", departmentId);

            if (departmentId == null || departmentId <= 0) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Invalid department ID"));
            }

            List<TbLine> rootLines = lineService.getRootLines(departmentId);
            return ResponseEntity.ok(
                    ApiResponse.success("Root lines retrieved successfully", rootLines));
        } catch (Exception e) {
            log.error("Error fetching root lines", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve root lines: " + e.getMessage()));
        }
    }

    //lay tát cả theo parentLineId
    @GetMapping("/children/{parentLineId}")
    public ResponseEntity<ApiResponse<List<TbLine>>> getChildLines(@PathVariable Integer parentLineId) {
        try {
            if (parentLineId == null || parentLineId <= 0) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Invalid parent line ID"));
            }

            List<TbLine> children = lineService.getChildLines(parentLineId);
            return ResponseEntity.ok(
                    ApiResponse.success("Child lines retrieved successfully", children));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve child lines: " + e.getMessage()));
        }
    }

}
