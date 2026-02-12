import { createApplication } from "@/lib/core/create-application";
import { bootstrap } from "@/lib/infrastructure/bootstrap";
import config from "~/app.config";

await bootstrap();

export default await createApplication(config);
