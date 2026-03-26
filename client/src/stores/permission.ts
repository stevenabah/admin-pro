import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/stores/user";

export interface Permission {
  id: string;
  name: string;
  code: string;
  type: string;
  path?: string;
  icon?: string;
  component?: string;
  sort: number;
  parentId?: string | null;
  children?: Permission[];
}

export const usePermissionStore = defineStore("permission", () => {
  const permissions = ref<Permission[]>([]);
  const permissionCodes = ref<string[]>([]);
  const menus = ref<Permission[]>([]);

  const loadPermissions = async () => {
    const res = await api.get("/permissions");
    if (res.code === 200) {
      permissions.value = res.data;
      buildMenus(res.data);
      buildCodes(res.data);
    }
  };

  const loadUserPermissions = async () => {
    const res = await api.get("/auth/user");
    if (res.code === 200 && res.data.role) {
      const role = res.data.role;
      permissionCodes.value = (role.permissions || []).map(
        (p: Permission) => p.code,
      );
      if (role.permissions) {
        buildMenus(role.permissions);
      }
    }
  };

  const buildMenus = (permList: Permission[]) => {
    menus.value = permList.filter((p) => p.type === "menu" && !p.parentId);
  };

  const buildCodes = (permList: Permission[]) => {
    const codes: string[] = [];
    const traverse = (list: Permission[]) => {
      for (const p of list) {
        codes.push(p.code);
        if (p.children?.length) traverse(p.children);
      }
    };
    traverse(permList);
    permissionCodes.value = codes;
  };

  const hasPermission = (code: string) => {
    return permissionCodes.value.includes(code);
  };

  return {
    permissions,
    permissionCodes,
    menus,
    loadPermissions,
    loadUserPermissions,
    hasPermission,
  };
});
