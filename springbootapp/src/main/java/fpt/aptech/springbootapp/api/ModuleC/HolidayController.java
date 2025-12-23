package fpt.aptech.springbootapp.api.ModuleC;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.entities.System.TbHoliday;
import fpt.aptech.springbootapp.repositories.System.HolidayRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;

@RestController
@RequestMapping("/api/holiday")
public class HolidayController {

    private HolidayRepository holidayRepo;
    private UserRepository userRepo;

    @Autowired
    public HolidayController(HolidayRepository holidayRepo, UserRepository userRepo) {
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

    //trả về ngày được chọn có phải ngày lễ hoặc ngày chủ nhật hay không
    @GetMapping("/isHolidayOrSunday/{date}")
    public ResponseEntity<?> isHolidayOrSunday(@PathVariable String date) {
        Map<String, Object> body = new HashMap<>();
        try {
            LocalDate localDate = LocalDate.parse(date);
            boolean isSunday = localDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY;
            boolean isHoliday = holidayRepo.existsByHolidayDate(localDate);
            boolean result = isSunday || isHoliday;
            body.put("success", true);
            body.put("data", result);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PostMapping("/replicate")
    public ResponseEntity<?> replicateHolidays(
            @RequestParam Integer fromYear,
            @RequestParam Integer toYear,
            @RequestParam(defaultValue = "false") boolean overwrite
    ) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (fromYear == null || toYear == null) {
                body.put("success", false);
                body.put("message", "fromYear và toYear là bắt buộc");
                return ResponseEntity.badRequest().body(body);
            }
            if (fromYear < 1900 || toYear < 1900) {
                body.put("success", false);
                body.put("message", "Năm không hợp lệ");
                return ResponseEntity.badRequest().body(body);
            }
            if (Objects.equals(fromYear, toYear)) {
                body.put("success", false);
                body.put("message", "fromYear và toYear không được trùng nhau");
                return ResponseEntity.badRequest().body(body);
            }

            final LocalDate start = LocalDate.of(fromYear, 1, 1);
            final LocalDate end = LocalDate.of(fromYear, 12, 31);
            final List<TbHoliday> source = holidayRepo.findByHolidayDateBetween(start, end);
            source.sort(Comparator.comparing(TbHoliday::getHolidayDate));

            int created = 0;
            int updated = 0;
            int skippedExisting = 0;
            final List<String> skippedInvalidDates = new ArrayList<>();

            for (TbHoliday h : source) {
                final LocalDate srcDate = h.getHolidayDate();
                if (srcDate == null) continue;

                final int m = srcDate.getMonthValue();
                final int d = srcDate.getDayOfMonth();

                final YearMonth ym = YearMonth.of(toYear, m);
                if (d > ym.lengthOfMonth()) {
                    skippedInvalidDates.add(String.format("%02d-%02d", m, d));
                    continue;
                }

                final LocalDate targetDate = LocalDate.of(toYear, m, d);
                final Optional<TbHoliday> existingOpt = holidayRepo.findFirstByHolidayDate(targetDate);

                if (existingOpt.isPresent() && !overwrite) {
                    skippedExisting++;
                    continue;
                }

                if (existingOpt.isPresent()) {
                    TbHoliday existing = existingOpt.get();
                    existing.setHolidayName(h.getHolidayName());
                    existing.setIsPaid(h.getIsPaid() != null ? h.getIsPaid() : Boolean.TRUE);
                    existing.setNote(h.getNote());
                    holidayRepo.save(existing);
                    updated++;
                    continue;
                }

                TbHoliday copy = new TbHoliday();
                copy.setHolidayDate(targetDate);
                copy.setHolidayName(h.getHolidayName());
                copy.setIsPaid(h.getIsPaid() != null ? h.getIsPaid() : Boolean.TRUE);
                copy.setNote(h.getNote());
                copy.setCreatedAt(Instant.now());

                holidayRepo.save(copy);
                created++;
            }

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("fromYear", fromYear);
            data.put("toYear", toYear);
            data.put("overwrite", overwrite);
            data.put("sourceCount", source.size());
            data.put("created", created);
            data.put("updated", updated);
            data.put("skippedExisting", skippedExisting);
            data.put("skippedInvalidDates", skippedInvalidDates);

            body.put("success", true);
            body.put("message", "Replicate holidays successfully");
            body.put("data", data);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}
