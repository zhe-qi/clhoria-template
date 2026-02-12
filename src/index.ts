import { bootstrap } from "@/lib/infrastructure/bootstrap";
import { createApplication } from "@/lib/internal/create-application";
import config from "~/app.config";

await bootstrap();

export default await createApplication(config);
