import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "vendor/domain-list-community/data");
const outputPath = path.join(rootDir, "src/generated/service_domains.ts");

function extractDomainSuffixes(service) {
    const sourcePath = path.join(dataDir, service);
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`缺少 ${sourcePath}，请先执行 git submodule update --init --recursive`);
    }

    const domains = [];
    const seen = new Set();
    for (const rawLine of fs.readFileSync(sourcePath, "utf8").split(/\r?\n/)) {
        const entry = rawLine.trim().split(/\s+/, 1)[0];
        if (!entry || entry.startsWith("#") || entry.startsWith("regexp:")) continue;

        const domain = entry.replace(/^(?:domain|full):/, "");
        if (!domain || domain.includes(":")) continue;
        if (!seen.has(domain)) {
            seen.add(domain);
            domains.push(domain);
        }
    }
    return domains.sort();
}

const anthropicDomains = extractDomainSuffixes("anthropic");
const openaiDomains = extractDomainSuffixes("openai");
const formatArray = (domains) =>
    domains.map((domain) => `    ${JSON.stringify(domain)},`).join("\n");
const output = `// 此文件由 scripts/generate-service-domains.mjs 自动生成，请勿手动修改。
// 数据源：vendor/domain-list-community/data/{anthropic,openai}

export const ANTHROPIC_DOMAIN_SUFFIXES = [
${formatArray(anthropicDomains)}
] as const;

export const OPENAI_DOMAIN_SUFFIXES = [
${formatArray(openaiDomains)}
] as const;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(`已生成 ${path.relative(rootDir, outputPath)}`);
