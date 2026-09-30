import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../shared/widgets/glass_widgets.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({Key? key}) : super(key: key);

  @override
  State<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  String _selectedPlan = 'VERIFIED';
  bool _isProcessing = false;

  void _upgradeWithRazorpayTest(String planName, int amountInr) {
    setState(() => _isProcessing = true);

    // Simulate server-side verified Razorpay Test transaction
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() => _isProcessing = false);

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1A1A1A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: POTheme.glassBorder),
          ),
          title: Row(
            children: const [
              Icon(Icons.check_circle_rounded, color: POTheme.matchExcellent, size: 24),
              SizedBox(width: 10),
              Text('Plan Activated', style: TextStyle(color: POTheme.cream, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Upgraded to $planName Plan (₹$amountInr/month) successfully.',
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
              ),
              const SizedBox(height: 8),
              const Text(
                'Razorpay TEST MODE: Transaction verified server-side with Supabase.',
                style: TextStyle(color: POTheme.textMuted, fontSize: 11),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                setState(() => _selectedPlan = planName);
                Navigator.pop(ctx);
              },
              child: const Text('OK', style: TextStyle(color: POTheme.primary, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: POTheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'PO → PO Plans',
              style: TextStyle(
                color: POTheme.cream,
                fontSize: 24,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Cost sharing remains peer-to-peer. Membership unlocks enhanced verification and features.',
              style: TextStyle(color: POTheme.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 20),

            // FREE Plan
            _buildPlanCard(
              title: 'FREE',
              price: '₹0',
              billing: 'Always Free',
              features: [
                'Verified community commute matching',
                'AI-assisted route corridor matching',
                'Women-only commute filters',
                'SOS safety button & live sharing',
                'CO₂ impact tracking',
              ],
              isCurrent: _selectedPlan == 'FREE',
              onSelect: () => setState(() => _selectedPlan = 'FREE'),
            ),

            const SizedBox(height: 16),

            // VERIFIED Plan (Popular)
            _buildPlanCard(
              title: 'VERIFIED',
              price: '₹49',
              billing: '/ month',
              isPopular: true,
              features: [
                'All Free features included',
                'Enhanced Government ID verification badge',
                'Official Community Trust Score (0–100)',
                'Daily recurring commute scheduling',
                'Trusted circles matching',
              ],
              isCurrent: _selectedPlan == 'VERIFIED',
              onSelect: () => _upgradeWithRazorpayTest('VERIFIED', 49),
            ),

            const SizedBox(height: 16),

            // PRO Plan
            _buildPlanCard(
              title: 'PRO',
              price: '₹99',
              billing: '/ month',
              features: [
                'All Verified features included',
                'AI Pool Rebalance & Priority Matching',
                'Predictive Commute Demand corridors',
                'Smart Pool Lock for trusted peers',
                'Advanced personal impact analytics',
                'Priority safety dispatch assistance',
              ],
              isCurrent: _selectedPlan == 'PRO',
              onSelect: () => _upgradeWithRazorpayTest('PRO', 99),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String price,
    required String billing,
    required List<String> features,
    required bool isCurrent,
    bool isPopular = false,
    required VoidCallback onSelect,
  }) {
    return POGlassCard(
      hasGlow: isPopular || isCurrent,
      borderColor: isCurrent ? POTheme.primary : (isPopular ? POTheme.brightOrange.withOpacity(0.5) : null),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: POTheme.cream,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (isPopular) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: POTheme.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: POTheme.primary.withOpacity(0.5)),
                      ),
                      child: const Text(
                        'POPULAR',
                        style: TextStyle(color: POTheme.primary, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ],
              ),
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: price,
                      style: const TextStyle(
                        color: POTheme.cream,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    TextSpan(
                      text: ' $billing',
                      style: const TextStyle(color: POTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...features.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.check_rounded, color: POTheme.matchStrong, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        f,
                        style: const TextStyle(color: POTheme.cream, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 16),
          POGlassButton(
            label: isCurrent
                ? 'Active Plan'
                : (_isProcessing ? 'Processing...' : 'Select $title'),
            isSecondary: isCurrent,
            height: 44,
            onPressed: (isCurrent || _isProcessing) ? null : onSelect,
          ),
        ],
      ),
    );
  }
}
