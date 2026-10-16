import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Bed, BedStatus, Room } from '../rooms.models';
import { ResidentsService } from '../../residents/residents.service';
import { ResidentGender, formatMobile, residentFullName } from '../../residents/residents.models';

export interface BedModalData {
  room: Room;
  bed: Bed;
  allRooms?: Room[];
  mode?: 'manage' | 'allocate' | 'transfer' | 'checkout';
}

export interface ResidentOption {
  residentId: string;
  name: string;
  contact: string;
  gender: ResidentGender;
  collegeOrCompany?: string;
}

@Component({
  selector: 'app-bed-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './bed-modal.component.html',
  styleUrl: './bed-modal.component.scss',
})
export class BedModalComponent implements OnInit {
  actionTab: 'manage' | 'allocate' | 'transfer' | 'checkout' = 'manage';

  // Forms
  manageForm: FormGroup;
  allocateForm: FormGroup;
  transferForm: FormGroup;
  checkoutForm: FormGroup;

  /** Residents (from Residents) who are current and don't hold a bed yet. */
  private readonly residentsService = inject(ResidentsService);
  readonly residentsList: ResidentOption[] = this.residentsService.residents
    .filter((r) => this.residentsService.needsBed(r))
    .map((r) => ({
      residentId: r.residentId,
      name: residentFullName(r),
      contact: formatMobile(r.mobileCode, r.mobile),
      gender: r.gender,
      collegeOrCompany: r.collegeOrCompany,
    }));
  readonly statuses: { value: BedStatus; label: string; icon: string }[] = [
    { value: 'Available', label: 'Available (Vacant)', icon: 'check_circle' },
    { value: 'Occupied', label: 'Occupied', icon: 'person' },
    { value: 'Reserved', label: 'Reserved / Booking Pending', icon: 'hourglass_top' },
    { value: 'Maintenance', label: 'Under Maintenance', icon: 'build' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<BedModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BedModalData,
  ) {
    const b = data.bed;
    const today = new Date().toISOString().slice(0, 10);

    // Initial tab
    if (data.mode) {
      this.actionTab = data.mode;
    } else if (b.status === 'Available') {
      this.actionTab = 'allocate';
    } else if (b.status === 'Occupied') {
      this.actionTab = 'manage';
    }

    // 1. Manage Form
    this.manageForm = this.fb.group({
      status: [b.status, Validators.required],
      tenantName: [b.tenantName || ''],
      tenantContact: [b.tenantContact || ''],
      monthlyRent: [b.monthlyRent || data.room.baseRent, [Validators.required, Validators.min(500)]],
    });

    // 2. Allocate Form
    this.allocateForm = this.fb.group({
      residentId: ['', Validators.required],
      joiningDate: [today, Validators.required],
      monthlyRent: [b.monthlyRent || data.room.baseRent, [Validators.required, Validators.min(500)]],
      notes: [''],
    });

    // 3. Transfer Form
    this.transferForm = this.fb.group({
      targetRoomId: ['', Validators.required],
      targetBedId: ['', Validators.required],
      effectiveDate: [today, Validators.required],
      reason: ['Resident relocation request'],
    });

    // 4. Check-out Form
    this.checkoutForm = this.fb.group({
      checkOutDate: [today, Validators.required],
      remarks: ['Normal checkout after completion of tenure'],
    });
  }

  ngOnInit(): void {}

  // Filter available destination rooms/beds for Transfer workflow
  get availableTransferRooms(): Room[] {
    return (this.data.allRooms || []).filter(
      (r) =>
        r.status !== 'Maintenance' &&
        r.status !== 'Inactive' &&
        r.beds.some((b) => b.status === 'Available' && b.id !== this.data.bed.id),
    );
  }

  get availableTransferBeds(): Bed[] {
    const selectedRoomId = this.transferForm.get('targetRoomId')?.value;
    if (!selectedRoomId) return [];
    const r = (this.data.allRooms || []).find((room) => room.id === selectedRoomId);
    return (r?.beds || []).filter((b) => b.status === 'Available');
  }

  // Filter residents matching the room's gender and college restrictions
  get eligibleResidents(): ResidentOption[] {
    const { genderRestriction, collegeRestriction } = this.data.room;
    return this.residentsList.filter(
      (r) =>
        (!genderRestriction || genderRestriction === 'Any' || r.gender === genderRestriction) &&
        (!collegeRestriction || collegeRestriction === 'Any' || r.collegeOrCompany === collegeRestriction),
    );
  }

  // Submit handlers
  onSaveManage(): void {
    if (this.manageForm.invalid) return;
    this.dialogRef.close({
      action: 'manage',
      ...this.manageForm.value,
    });
  }

  onSaveAllocate(): void {
    if (this.allocateForm.invalid) return;
    const val = this.allocateForm.value;
    const resident = this.residentsList.find((r) => r.residentId === val.residentId);
    if (!resident) return;

    this.dialogRef.close({
      action: 'allocate',
      resident: {
        residentId: resident.residentId,
        name: resident.name,
        contact: resident.contact,
        gender: resident.gender,
        collegeOrCompany: resident.collegeOrCompany,
      },
      joiningDate: val.joiningDate,
      monthlyRent: val.monthlyRent,
      notes: val.notes,
    });
  }

  onSaveTransfer(): void {
    if (this.transferForm.invalid) return;
    this.dialogRef.close({
      action: 'transfer',
      ...this.transferForm.value,
    });
  }

  onSaveCheckout(): void {
    if (this.checkoutForm.invalid) return;
    this.dialogRef.close({
      action: 'checkout',
      ...this.checkoutForm.value,
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
