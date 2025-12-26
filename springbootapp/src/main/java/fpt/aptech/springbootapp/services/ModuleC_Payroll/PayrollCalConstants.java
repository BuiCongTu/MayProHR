package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;

public class PayrollCalConstants {
    //tinh chuẩn công
    public static final BigDecimal STANDARD_WORKING_DAYS = new BigDecimal("26");  // Đã trừ chủ nhật
    public static final BigDecimal HOURS_PER_DAY = new BigDecimal("8");
    //hệ số tăng ca
    public static final BigDecimal OT1_MULTIPLIER = new BigDecimal("1.5");
    public static final BigDecimal OT2_MULTIPLIER = new BigDecimal("2.0");  // OT ngày lễ/chủ nhật

//    các khoản phat va BH
    public static final BigDecimal LATE_PENALTY = new BigDecimal("50000");  // Phạt đi trễ
    public static final BigDecimal INSURANCE_RATE = new BigDecimal("0.105");  // Bảo hiểm 10.5%

    //các khoan giam tru thue
    public static final BigDecimal TAX_BRACKET_1_TO = new BigDecimal("10000000");
    public static final BigDecimal TAX_BRACKET_1_RATE = new BigDecimal("0.05");

    public static final BigDecimal TAX_BRACKET_2_FROM = new BigDecimal("10000000");
    public static final BigDecimal TAX_BRACKET_2_TO = new BigDecimal("30000000");
    public static final BigDecimal TAX_BRACKET_2_RATE = new BigDecimal("0.10");

    public static final BigDecimal TAX_BRACKET_3_FROM = new BigDecimal("30000000");
    public static final BigDecimal TAX_BRACKET_3_TO = new BigDecimal("60000000");
    public static final BigDecimal TAX_BRACKET_3_RATE = new BigDecimal("0.20");

    // === Độ chính xác ===
    public static final int SCALE = 2;  // 2 chữ số thập phân

}
