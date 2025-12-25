package fpt.aptech.springbootapp.services.System;

import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

@Service
public class DemoTimeService {

    private Clock clock = Clock.systemDefaultZone();
    private boolean isFixed = false;

    /**
     * Call this to freeze time at a specific point for the demo.
     */
    public void setFixedTime(LocalDateTime fixedDateTime) {
        this.clock = Clock.fixed(fixedDateTime.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault());
        this.isFixed = true;
    }

    /**
     * Call this to return to normal system time.
     */
    public void resetToSystemTime() {
        this.clock = Clock.systemDefaultZone();
        this.isFixed = false;
    }

    public LocalDate getCurrentDate() {
        return LocalDate.now(clock);
    }

    public LocalTime getCurrentTime() {
        return LocalTime.now(clock);
    }

    public boolean isTimeFixed() {
        return isFixed;
    }
}