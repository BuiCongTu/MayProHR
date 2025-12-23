import '../configs/AttendanceApi.dart';
import '../models/AttendanceRecord.dart';
import 'storage_service.dart';

class AttendanceService {
  AttendanceService()
      : _api = AttendanceApi(
          getToken: () => StorageService().getToken(),
        );

  final AttendanceApi _api;

  Future<List<AttendanceRecord>> getMyAttendanceByMonth({
    required int userId,
    required String month, // YYYY-MM
  }) {
    return _api.getByMonth(month: month, userId: userId);
  }

  Future<List<AttendanceRecord>> getMyAttendanceByYear({
    required int userId,
    required int year,
  }) {
    return _api.getByYear(year: year, userId: userId);
  }

  Future<List<AttendanceRecord>> getMyAttendanceByDate({
    required int userId,
    required String date, // YYYY-MM-DD
  }) {
    return _api.getByDate(date: date, userId: userId);
  }
}