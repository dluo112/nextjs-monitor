// Types for AutoDL API responses

export interface AutoDLResponse<T = any> {
  code: string;
  msg: string;
  data: T;
}

export interface LoginV1Data {
  ticket: string;
  // other fields omitted
}

export interface LoginV2Data {
  token: string;
  // other fields omitted
}

export interface InstanceGPU {
  name: string;
  // other fields
}

export interface Instance {
  instance_uuid: string;
  machine_name: string;
  status: string;
  gpu_name: string;
  req_gpu_amount: number;
  region_name?: string;
}

export interface MachineGPU {
  idle: number;
  total: number;
}

export interface Machine {
  machine_name: string; // Assuming uuid or name is key
  gpu: MachineGPU;
  is_running: boolean;
  // other fields
}

export interface UserInfo {
  username: string;
  user_uuid: string;
  tenant_uuid: string;
  balance: number;
  uid: number;
}

export interface Tenant {
  tenant_name: string;
  tenant_uuid: string;
  role: string;
}

export interface SwitchTenantData {
  token: string;
  is_admin: boolean;
  is_platform_admin: boolean;
}

export const API_URLS = {
  login_v1: "https://www.autodl.com/api/v1/new_login",
  passport: "https://www.autodl.com/api/v1/passport",
  sso_ticket: "https://www.autodl.com/api/v1/sso/ticket",
  login_v2: "https://private.autodl.com/api/v2/login",
  user_info: "https://private.autodl.com/api/v2/user/get",
  tenant_list: "https://private.autodl.com/api/v2/user/tenant",
  switch_tenant: "https://private.autodl.com/api/v2/user/switch",
  instance_list: "https://private.autodl.com/api/v2/instance/list",
  machine_list: "https://private.autodl.com/api/v2/machine/list",
  power_on: "https://private.autodl.com/api/v2/instance/power_on",
};
