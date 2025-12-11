package fpt.aptech.springbootapp.api;

import java.util.List;

import fpt.aptech.springbootapp.dtos.response.LineDto;
import fpt.aptech.springbootapp.dtos.response.LineHierarchyDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    //lấy tất cả line, subline, ... của 1 department
    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<LineDto>> getLinesByDepartment(@PathVariable Integer deptId) {
        try {
            List<LineDto> lines = lineService.getLinesByDepartment(deptId);
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

    //lay tất cả line từ line cha - sub line -> word unit
    @GetMapping("/hierarchy")
    public ResponseEntity<ApiResponse<LineHierarchyDto>> getLineHierarchy(
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer lineId,
            @RequestParam(required = false) Integer parentId) {
        try {
            log.info("Request: Get line hierarchy - departmentId: {}, lineId: {}, parentId: {}",
                    departmentId, lineId, parentId);

            if ((departmentId == null || departmentId <= 0) &&
                    (lineId == null || lineId <= 0) &&
                    (parentId == null || parentId <= 0)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("At least one parameter (departmentId, lineId, or parentId) must be provided"));
            }

            LineHierarchyDto hierarchy = lineService.getLineHierarchy(departmentId, lineId, parentId);
            return ResponseEntity.ok(ApiResponse.success("Line hierarchy retrieved successfully", hierarchy));
        } catch (RuntimeException ex) {
            log.error("Error fetching line hierarchy", ex);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error fetching line hierarchy", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve line hierarchy: " + e.getMessage()));
        }
    }


}
