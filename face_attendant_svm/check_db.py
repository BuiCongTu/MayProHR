#!/usr/bin/env python3
"""
Kiểm tra và xem dữ liệu trong database
"""

import sqlite3
from datetime import datetime

def check_database():
    print("  KIỂM TRA DATABASE")
    print("=" * 40)
    
    conn = sqlite3.connect('employees.db')
    cursor = conn.cursor()
    
    # Kiểm tra bảng employees
    print("\n👥 BẢNG EMPLOYEES:")
    cursor.execute("SELECT * FROM Employee")
    employees = cursor.fetchall()
    if employees:
        print("ID     | Tên")
        print("-------|--------------------")
        for employee in employees:
            print(f"{employee[0]:<6} | {employee[1]}")
    else:
        print("Không có dữ liệu")
    
    # Kiểm tra bảng attendance
    print("\n 📋 BẢNG ATTENDANCE:")
    try:
        cursor.execute("SELECT * FROM attendance ORDER BY timestamp DESC")
        attendance = cursor.fetchall()
        if attendance:
            print("ID     | Tên        | Ca học   | Thời gian")
            print("-------|------------|----------|------------------------")
            for record in attendance:
                print(f"{record[1]:<6} | {record[2]:<10} | {record[3]:<8} | {record[4]}")
        else:
            print("Chưa có dữ liệu điểm danh")
    except sqlite3.OperationalError:
        print("Bảng attendance chưa được tạo")
    
    conn.close()

def init_attendance_manually():
    """Tạo bảng attendance thủ công"""
    conn = sqlite3.connect('employees.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT NOT NULL,
            employee_name TEXT NOT NULL,
            session TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            confidence REAL,
            FOREIGN KEY (employee_id) REFERENCES Employee (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print(" Đã tạo bảng attendance")

if __name__ == "__main__":
    check_database()
    
    # Tạo bảng attendance nếu chưa có
    print("\n Tạo bảng attendance...")
    init_attendance_manually()
    
    print("\n" + "=" * 40)
    check_database()