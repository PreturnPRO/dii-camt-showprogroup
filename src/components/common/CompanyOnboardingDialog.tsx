import React from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const requiredCompanyFields = [
  'companyName',
  'companyNameThai',
  'industry',
  'size',
  'contactPersonName',
  'contactPersonPhone',
];

export function CompanyOnboardingDialog() {
  const { user, updateProfile } = useAuth();
  const rawUser = asRecord(user?.raw);
  const companyProfile = asRecord(rawUser.companyProfile);
  const isCompany = user?.role === 'company';
  const missingRequiredField = requiredCompanyFields.some((field) => !asString(companyProfile[field]));
  const shouldOpen = Boolean(isCompany && missingRequiredField);
  const [open, setOpen] = React.useState(shouldOpen);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    companyName: asString(companyProfile.companyName),
    companyNameThai: asString(companyProfile.companyNameThai),
    industry: asString(companyProfile.industry, 'Technology'),
    size: asString(companyProfile.size, 'small'),
    website: asString(companyProfile.website),
    address: asString(companyProfile.address),
    productsServices: asString(companyProfile.productsServices),
    contactPersonName: asString(companyProfile.contactPersonName),
    contactPersonRole: asString(companyProfile.contactPersonRole, 'HR / Company Coordinator'),
    contactPersonEmail: asString(companyProfile.contactPersonEmail, user?.email ?? ''),
    contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
    socialMedia: asString(companyProfile.socialMedia),
    currentPassword: '',
    newPassword: '',
  });

  React.useEffect(() => {
    setOpen(shouldOpen);
    setFormData({
      companyName: asString(companyProfile.companyName),
      companyNameThai: asString(companyProfile.companyNameThai),
      industry: asString(companyProfile.industry, 'Technology'),
      size: asString(companyProfile.size, 'small'),
      website: asString(companyProfile.website),
      address: asString(companyProfile.address),
      productsServices: asString(companyProfile.productsServices),
      contactPersonName: asString(companyProfile.contactPersonName),
      contactPersonRole: asString(companyProfile.contactPersonRole, 'HR / Company Coordinator'),
      contactPersonEmail: asString(companyProfile.contactPersonEmail, user?.email ?? ''),
      contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
      socialMedia: asString(companyProfile.socialMedia),
      currentPassword: '',
      newPassword: '',
    });
  }, [companyProfile, shouldOpen, user?.email, user?.phone]);

  if (!isCompany) return null;

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.companyName,
        nameThai: formData.companyNameThai,
        phone: formData.contactPersonPhone || user?.phone,
        currentPassword: formData.currentPassword || undefined,
        newPassword: formData.newPassword || undefined,
        roleData: {
          companyName: formData.companyName,
          companyNameThai: formData.companyNameThai,
          industry: formData.industry,
          size: formData.size,
          website: formData.website || undefined,
          address: formData.address || undefined,
          productsServices: formData.productsServices || undefined,
          contactPersonName: formData.contactPersonName,
          contactPersonRole: formData.contactPersonRole,
          contactPersonEmail: formData.contactPersonEmail || undefined,
          contactPersonPhone: formData.contactPersonPhone,
          socialMedia: formData.socialMedia || undefined,
          onboardingStatus: 'completed',
          privacyProtocolAcceptedAt: new Date().toISOString(),
        },
      });
      toast.success('บันทึกข้อมูลบริษัทแล้ว');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกข้อมูลบริษัทไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            กรอกข้อมูลบริษัทให้ครบ
          </DialogTitle>
          <DialogDescription>
            ระบบต้องมีข้อมูลบริษัทและผู้ประสานงานก่อนใช้งานต่อ ส่วนรหัสผ่านสามารถเปลี่ยนได้โดยกรอกรหัสผ่านปัจจุบันพร้อมรหัสผ่านใหม่
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label>ชื่อบริษัท</Label>
            <Input value={formData.companyName} onChange={(event) => updateField('companyName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ชื่อบริษัทภาษาไทย</Label>
            <Input value={formData.companyNameThai} onChange={(event) => updateField('companyNameThai', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>อุตสาหกรรม</Label>
            <Input value={formData.industry} onChange={(event) => updateField('industry', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ขนาดบริษัท</Label>
            <Input value={formData.size} onChange={(event) => updateField('size', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ผู้ประสานงาน</Label>
            <Input value={formData.contactPersonName} onChange={(event) => updateField('contactPersonName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>เบอร์ผู้ประสานงาน</Label>
            <Input value={formData.contactPersonPhone} onChange={(event) => updateField('contactPersonPhone', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>อีเมลผู้ประสานงาน</Label>
            <Input value={formData.contactPersonEmail} onChange={(event) => updateField('contactPersonEmail', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ตำแหน่งผู้ประสานงาน</Label>
            <Input value={formData.contactPersonRole} onChange={(event) => updateField('contactPersonRole', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>รหัสผ่านปัจจุบัน</Label>
            <Input type="password" value={formData.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>รหัสผ่านใหม่</Label>
            <Input type="password" value={formData.newPassword} onChange={(event) => updateField('newPassword', event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
