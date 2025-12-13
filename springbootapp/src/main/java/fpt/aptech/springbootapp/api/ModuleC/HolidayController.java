package fpt.aptech.springbootapp.api.ModuleC;

import fpt.aptech.springbootapp.entities.System.TbHoliday;
import fpt.aptech.springbootapp.repositories.System.HolidayRepositpry;
import fpt.aptech.springbootapp.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;


@RestController
@RequestMapping("/api/holiday")
public class HolidayController {
    private HolidayRepositpry holidayRepo;
    private UserRepository userRepo;

    @Autowired
    public HolidayController(HolidayRepositpry holidayRepo, UserRepository userRepo) {
        this.holidayRepo = holidayRepo;
        this.userRepo = userRepo;
    }

    //laays ds holiday
    @GetMapping
    public ResponseEntity<?> getHolidays(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        Map<String, Object> body = new HashMap<>();
        try {
            List<TbHoliday> holidays;

            if (year != null && month != null) {
                LocalDate start = LocalDate.of(year, month, 1);
                LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
                holidays = holidayRepo.findByHolidayDateBetween(start, end);
            } else if (year != null) {
                LocalDate start = LocalDate.of(year, 1, 1);
                LocalDate end = LocalDate.of(year, 12, 31);
                holidays = holidayRepo.findByHolidayDateBetween(start, end);
            } else {
                holidays = holidayRepo.findAll();
            }

            holidays.sort(Comparator.comparing(TbHoliday::getHolidayDate));

            body.put("success", true);
            body.put("message", "Get holidays successfully");
            body.put("data", holidays);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }


    //lay holiday theo id
    @GetMapping("/{id}")
    public ResponseEntity<?> getHolidayById(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbHoliday holiday = holidayRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Holiday not found: " + id));

            body.put("success", true);
            body.put("data", holiday);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }


    //create holiday
    @PostMapping
    public ResponseEntity<?> createHoliday(@RequestBody TbHoliday request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getHolidayDate() == null) {
                body.put("success", false);
                body.put("message", "holidayDate is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getHolidayName() == null || request.getHolidayName().isBlank()) {
                body.put("success", false);
                body.put("message", "holidayName is required");
                return ResponseEntity.badRequest().body(body);
            }

            if (holidayRepo.existsByHolidayDate(request.getHolidayDate())) {
                body.put("success", false);
                body.put("message", "Holiday already exists on date: " + request.getHolidayDate());
                return ResponseEntity.badRequest().body(body);
            }

            TbHoliday holiday = new TbHoliday();
            holiday.setHolidayDate(request.getHolidayDate());
            holiday.setHolidayName(request.getHolidayName());
            holiday.setIsPaid(request.getIsPaid() != null ? request.getIsPaid() : Boolean.TRUE);
            holiday.setNote(request.getNote());
            holiday.setCreatedAt(Instant.now());

            TbHoliday saved = holidayRepo.save(holiday);

            body.put("success", true);
            body.put("message", "Create holiday successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Update holiday
    @PutMapping("/{id}")
    public ResponseEntity<?> updateHoliday(@PathVariable Integer id,
                                           @RequestBody TbHoliday request) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbHoliday holiday = holidayRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Holiday not found: " + id));

            if (request.getHolidayDate() == null) {
                body.put("success", false);
                body.put("message", "holidayDate is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getHolidayName() == null || request.getHolidayName().isBlank()) {
                body.put("success", false);
                body.put("message", "holidayName is required");
                return ResponseEntity.badRequest().body(body);
            }

            // Kiểm tra trùng ngày với holiday khác
            if (!holiday.getHolidayDate().equals(request.getHolidayDate())
                    && holidayRepo.existsByHolidayDate(request.getHolidayDate())) {
                body.put("success", false);
                body.put("message", "Another holiday already exists on date: " + request.getHolidayDate());
                return ResponseEntity.badRequest().body(body);
            }

            holiday.setHolidayDate(request.getHolidayDate());
            holiday.setHolidayName(request.getHolidayName());
            holiday.setIsPaid(request.getIsPaid() != null ? request.getIsPaid() : Boolean.TRUE);
            holiday.setNote(request.getNote());

            TbHoliday saved = holidayRepo.save(holiday);

            body.put("success", true);
            body.put("message", "Update holiday successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Delete holiday
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHoliday(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbHoliday holiday = holidayRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Holiday not found: " + id));

            holidayRepo.delete(holiday);

            body.put("success", true);
            body.put("message", "Delete holiday successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }


}
