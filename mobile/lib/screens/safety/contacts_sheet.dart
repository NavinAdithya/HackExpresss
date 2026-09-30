import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/safety_service.dart';

class ContactsSheet extends StatefulWidget {
  const ContactsSheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const ContactsSheet(),
    );
  }

  @override
  State<ContactsSheet> createState() => _ContactsSheetState();
}

class _ContactsSheetState extends State<ContactsSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _relationCtrl = TextEditingController(text: 'Friend');
  bool _isAdding = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _relationCtrl.dispose();
    super.dispose();
  }

  void _saveContact() {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      return;
    }
    SafetyService.instance.addEmergencyContact(
      _nameCtrl.text.trim(),
      _phoneCtrl.text.trim(),
      _relationCtrl.text.trim(),
    );
    setState(() {
      _isAdding = false;
      _nameCtrl.clear();
      _phoneCtrl.clear();
      _relationCtrl.text = 'Friend';
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final contacts = SafetyService.instance.contacts;

        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            decoration: BoxDecoration(
              color: const Color(0xF2141414),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(color: POTheme.glassBorder),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Emergency Contacts',
                        style: TextStyle(
                          color: POTheme.cream,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          _isAdding ? Icons.close_rounded : Icons.person_add_rounded,
                          color: POTheme.primary,
                        ),
                        onPressed: () => setState(() => _isAdding = !_isAdding),
                      ),
                    ],
                  ),
                  const Text(
                    'Selected contacts will receive Journey and SOS emergency alerts.',
                    style: TextStyle(color: POTheme.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 16),

                  if (_isAdding) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0x33FFFFFF),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: POTheme.primary.withOpacity(0.5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Add New Contact', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _nameCtrl,
                            style: const TextStyle(color: POTheme.cream, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Full Name (e.g. Papa, Roommate)',
                              hintStyle: const TextStyle(color: POTheme.textMuted),
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _phoneCtrl,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(color: POTheme.cream, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Phone Number (e.g. +91 98401 23456)',
                              hintStyle: const TextStyle(color: POTheme.textMuted),
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _relationCtrl,
                            style: const TextStyle(color: POTheme.cream, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Relationship (e.g. Family, Partner)',
                              hintStyle: const TextStyle(color: POTheme.textMuted),
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () => setState(() => _isAdding = false),
                                child: const Text('Cancel', style: TextStyle(color: POTheme.textMuted)),
                              ),
                              ElevatedButton(
                                onPressed: _saveContact,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: POTheme.primary,
                                  foregroundColor: POTheme.cream,
                                ),
                                child: const Text('Save Contact'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  ...contacts.map((c) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: const Color(0x22FFFFFF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: c.isSelected ? POTheme.primary.withOpacity(0.5) : POTheme.glassBorder,
                          ),
                        ),
                        child: CheckboxListTile(
                          value: c.isSelected,
                          activeColor: POTheme.primary,
                          checkColor: POTheme.cream,
                          title: Text(
                            c.name,
                            style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          subtitle: Text(
                            '${c.relation} · ${c.phone}',
                            style: const TextStyle(color: POTheme.textMuted, fontSize: 12),
                          ),
                          onChanged: (_) => SafetyService.instance.toggleContactSelection(c.id),
                        ),
                      )),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
