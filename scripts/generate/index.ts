import { insertMenuSchema } from "@/db/schema/menu";
import { formatSafeJson } from "@/utils";
import { extractSchemaFields } from "@/utils/zod/format-schema";

const groupModel = [insertMenuSchema];

const res = groupModel.map((item) => {
  const json = formatSafeJson<ParamsType>(item);

  const model = extractSchemaFields(item);

  const fields = model.map((field) => {
    return {
      ...field,
      isTableColumn: true,
      isFormItem: true,
    };
  });

  return {
    name: json.name,
    title: json.title,
    fields,
    // 弹窗类型 抽屉 对话框 页面
    modalType: "drawer",
  };
});

console.log(JSON.stringify(res, null, 2));
