import 'package:supabase_flutter/supabase_flutter.dart';

class POSupabase {
  static const String supabaseUrl = 'https://jdmvqjtdiimugwuvcddd.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbXZxanRkaWltdWd3dXZjZGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDI4NTAsImV4cCI6MjEwNjI3ODg1MH0.FiSPrY4KoJvH28txOYaeHzixMdYby6QIfojf7g92UYM';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
