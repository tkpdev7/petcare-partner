# Add Partner Slot Management APIs to apiService.ts

Add the following functions to `services/apiService.ts` after the `getAvailableSlots()` function (around line 259):

```typescript
  // Partner Service Slots Management APIs
  async toggleActiveOnline(isActive: boolean): Promise<ApiResponse> {
    return this.makeRequest('PATCH', '/partner-slots/active-status', {
      is_active_online: isActive
    });
  }

  async createPartnerSlots(slotData: {
    slot_date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-slots/slots', slotData);
  }

  async getPartnerSlots(params?: {
    from_date?: string;
    to_date?: string;
    is_available?: boolean;
    limit?: number;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/partner-slots/slots', undefined, config);
  }

  async getSlotsByDate(date: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/partner-slots/slots/by-date?date=${date}`);
  }

  async updatePartnerSlot(slotId: number, updates: {
    slot_date?: string;
    start_time?: string;
    end_time?: string;
    slot_duration?: number;
    is_available?: boolean;
  }): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/partner-slots/slots/${slotId}`, updates);
  }

  async deletePartnerSlot(slotId: number): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/partner-slots/slots/${slotId}`);
  }
```

## Installation Note

Make sure you have `react-native-picker-select` installed for the slot duration dropdown in manageSlots.tsx:

```bash
cd /c/Users/mahen/petcare/petcare-partner
npm install react-native-picker-select
```
