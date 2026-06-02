<?php

namespace App\Service;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;

final class HelloworkOfferScraper
{
    private const URL = 'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=alternance&k_autocomplete=&l=&l_autocomplete=';
    private const CACHE_TTL_SECONDS = 900;
    private const CACHE_SCHEMA_VERSION = 2;

    public function __construct(
        private readonly string $projectDir,
    ) {
    }

    /**
     * @return array<int, array{
     *     id: string,
     *     title: string,
     *     description: ?string,
     *     tags: array<int, string>,
     *     source: string,
     *     externalUrl: string,
     *     publishedAt: ?string,
     *     company: array{
     *         id: string,
     *         name: string,
     *         location: ?string,
     *         specialties: array<int, string>
     *     },
     *     details: array<string, mixed>
     * }>
     */
    public function fetchLatestOffers(int $limit = 5): array
    {
        $cached = $this->readCache();
        $cachedOffers = $this->cachedOffers($cached, $limit);

        if ($cachedOffers !== null && is_array($cached) && isset($cached['fetchedAt'])) {
            $age = time() - (int) $cached['fetchedAt'];
            if ($age >= 0 && $age < self::CACHE_TTL_SECONDS) {
                return $cachedOffers;
            }
        }

        try {
            $html = $this->downloadHtml();
            $offers = $this->parseOffers($html, $limit);

            $this->writeCache([
                'schemaVersion' => self::CACHE_SCHEMA_VERSION,
                'fetchedAt' => time(),
                'offers' => $offers,
            ]);

            return $offers;
        } catch (\Throwable) {
            if ($cachedOffers !== null) {
                return $cachedOffers;
            }

            throw new RuntimeException('Unable to fetch HelloWork offers.');
        }
    }

    private function downloadHtml(): string
    {
        if (function_exists('curl_init')) {
            return $this->downloadWithCurl(self::URL);
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $this->browserHeaders()),
                'timeout' => 20,
            ],
        ]);

        $html = @file_get_contents(self::URL, false, $context);
        if ($html === false) {
            throw new RuntimeException('Unable to fetch HelloWork offers.');
        }

        return $html;
    }

    private function downloadDetailHtml(string $url): string
    {
        return function_exists('curl_init') ? $this->downloadWithCurl($url) : $this->downloadWithStream($url);
    }

    private function downloadWithStream(string $url): string
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $this->browserHeaders()),
                'timeout' => 20,
            ],
        ]);

        $html = @file_get_contents($url, false, $context);
        if ($html === false) {
            throw new RuntimeException('Unable to fetch HelloWork detail page.');
        }

        return $html;
    }

    private function downloadWithCurl(string $url): string
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Unable to initialize cURL.');
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => $this->browserHeaders(),
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        ]);

        $html = curl_exec($handle);

        if ($html === false) {
            $message = curl_error($handle) ?: 'Unknown cURL error.';
            curl_close($handle);
            throw new RuntimeException('Unable to fetch HelloWork content: '.$message);
        }

        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('HelloWork returned HTTP '.$status.'.');
        }

        return (string) $html;
    }

    /**
     * @return array<int, string>
     */
    private function browserHeaders(): array
    {
        return [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
            'Cache-Control: no-cache',
            'Pragma: no-cache',
            'Sec-Fetch-Dest: document',
            'Sec-Fetch-Mode: navigate',
            'Sec-Fetch-Site: none',
            'Sec-Fetch-User: ?1',
            'Upgrade-Insecure-Requests: 1',
        ];
    }

    /**
     * @return array<int, array{
     *     id: string,
     *     title: string,
     *     description: ?string,
     *     tags: array<int, string>,
     *     source: string,
     *     externalUrl: string,
     *     publishedAt: ?string,
     *     company: array{
     *         id: string,
     *         name: string,
     *         location: ?string,
     *         specialties: array<int, string>
     *     },
     *     details: array<string, mixed>
     * }>
     */
    private function parseOffers(string $html, int $limit): array
    {
        $previousUseErrors = libxml_use_internal_errors(true);
        $document = new DOMDocument();
        $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        $xpath = new DOMXPath($document);
        $cards = $xpath->query('//li[@data-id-storage-item-id]');

        if (!$cards instanceof \DOMNodeList) {
            return [];
        }

        $offers = [];

        foreach ($cards as $index => $card) {
            if ($index >= max($limit * 2, $limit) || !$card instanceof DOMElement) {
                break;
            }

            $offerId = trim((string) $card->getAttribute('data-id-storage-item-id'));
            $title = $this->text($xpath, $card, './/*[@data-cy="offerTitle"]//p[1]');
            $companyName = $this->text($xpath, $card, './/*[@data-cy="offerTitle"]//p[2]');
            $location = $this->text($xpath, $card, './/*[@data-cy="localisationCard"]');
            $contract = $this->text($xpath, $card, './/*[@data-cy="contractCard"]');
            $salary = $this->salary($xpath, $card);
            $duration = $this->text($xpath, $card, './/*[@data-cy="contractTag"]');
            $publishedAt = $this->publishedAt($xpath, $card);
            $href = $this->attr($xpath, $card, './/*[@data-cy="offerTitle"]', 'href');
            $externalUrl = $this->absoluteUrl($href);

            $detail = $this->fetchDetail($externalUrl);

            $offers[] = [
                'id' => $offerId !== '' ? 'hellowork-'.$offerId : 'hellowork-'.$index,
                'title' => $title !== '' ? $title : ($detail['title'] ?? ''),
                'description' => $this->joinParts([$contract, $salary, $duration]),
                'tags' => array_values(array_unique(array_filter([$contract, $duration, $detail['industry'] ?? null]))),
                'source' => 'HelloWork',
                'externalUrl' => $externalUrl,
                'publishedAt' => $publishedAt,
                'company' => [
                    'id' => $offerId !== '' ? 'hellowork-company-'.$offerId : 'hellowork-company-'.$index,
                    'name' => $companyName !== '' ? $companyName : ($detail['company']['name'] ?? ''),
                    'location' => $location !== '' ? $location : ($detail['location']['label'] ?? null),
                    'specialties' => $salary !== '' ? [$salary] : [],
                ],
                'details' => $detail,
            ];
        }

        $offers = array_values(array_filter($offers, static fn (array $offer): bool => $offer['title'] !== ''));
        usort($offers, function (array $left, array $right): int {
            $leftDate = $this->publicationTimestamp($left);
            $rightDate = $this->publicationTimestamp($right);

            return $rightDate <=> $leftDate;
        });

        return array_slice($offers, 0, $limit);
    }

    private function text(DOMXPath $xpath, DOMElement $context, string $query): string
    {
        $nodes = $xpath->query($query, $context);
        if (!$nodes instanceof \DOMNodeList || $nodes->length === 0) {
            return '';
        }

        $node = $nodes->item(0);

        return $node ? $this->cleanText($node->textContent) : '';
    }

    private function attr(DOMXPath $xpath, DOMElement $context, string $query, string $attribute): string
    {
        $nodes = $xpath->query($query, $context);
        if (!$nodes instanceof \DOMNodeList || $nodes->length === 0) {
            return '';
        }

        $node = $nodes->item(0);
        if (!$node instanceof \DOMElement) {
            return '';
        }

        return trim((string) $node->getAttribute($attribute));
    }

    private function salary(DOMXPath $xpath, DOMElement $context): string
    {
        $nodes = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " tag-secondary-s ")]', $context);
        if (!$nodes instanceof \DOMNodeList) {
            return '';
        }

        foreach ($nodes as $node) {
            $text = $this->cleanText($node->textContent);
            if (str_contains($text, '€')) {
                return $text;
            }
        }

        return '';
    }

    private function publishedAt(DOMXPath $xpath, DOMElement $context): string
    {
        $nodes = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " text-grey-500 ")]', $context);
        if (!$nodes instanceof \DOMNodeList) {
            return '';
        }

        foreach ($nodes as $node) {
            $text = $this->cleanText($node->textContent);
            if (str_starts_with($text, 'il y a ')) {
                return $text;
            }
        }

        return '';
    }

    /**
     * @param array<string, mixed> $offer
     */
    private function publicationTimestamp(array $offer): int
    {
        $detailsPublishedAt = $offer['details']['publishedAt'] ?? null;
        if (is_string($detailsPublishedAt) && $detailsPublishedAt !== '') {
            $timestamp = strtotime($detailsPublishedAt);
            if ($timestamp !== false) {
                return $timestamp;
            }
        }

        $publishedAt = $offer['publishedAt'] ?? null;
        if (is_string($publishedAt) && $publishedAt !== '') {
            if (preg_match('/(\d+)\s+(minute|minutes|heure|heures|jour|jours|semaine|semaines|mois)/u', $publishedAt, $matches)) {
                $amount = (int) $matches[1];
                $unit = $matches[2];

                return match ($unit) {
                    'minute', 'minutes' => time() - ($amount * 60),
                    'heure', 'heures' => time() - ($amount * 3600),
                    'jour', 'jours' => time() - ($amount * 86400),
                    'semaine', 'semaines' => time() - ($amount * 7 * 86400),
                    'mois' => time() - ($amount * 30 * 86400),
                    default => 0,
                };
            }
        }

        return 0;
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchDetail(string $url): array
    {
        try {
            $html = $this->downloadDetailHtml($url);
        } catch (\Throwable) {
            return [
                'url' => $url,
                'summary' => null,
                'sections' => [],
                'company' => ['name' => null],
                'location' => ['label' => null],
            ];
        }

        return $this->parseDetailPage($html, $url);
    }

    /**
     * @return array<string, mixed>
     */
    private function parseDetailPage(string $html, string $url): array
    {
        $previousUseErrors = libxml_use_internal_errors(true);
        $document = new DOMDocument();
        $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        $xpath = new DOMXPath($document);
        $jobPosting = $this->extractJsonLdObject($document, 'JobPosting');
        $agentJson = $this->extractAgentJson($document);

        $descriptionHtml = is_string($jobPosting['description'] ?? null) ? (string) $jobPosting['description'] : '';
        $sections = $this->extractSectionsFromHtml($descriptionHtml);
        $summary = $this->firstSectionBody($sections);
        $companyName = (string) ($jobPosting['hiringOrganization']['name'] ?? $agentJson['Company'] ?? '');
        $location = $this->extractLocation($jobPosting);
        $salary = $this->extractSalary($jobPosting);
        $employmentType = $this->normalizeList($jobPosting['employmentType'] ?? []);
        $educationRequirements = $this->extractEducationRequirements($jobPosting);

        return [
            'url' => (string) ($jobPosting['url'] ?? $url),
            'title' => (string) ($jobPosting['title'] ?? ''),
            'summary' => $summary,
            'description' => $this->normalizeWhitespace($this->stripHtmlToText($descriptionHtml)),
            'sections' => $sections,
            'salary' => $salary,
            'industry' => $this->valueToString($jobPosting['industry'] ?? null),
            'contract' => $agentJson['ContractType'] ?? ($employmentType[0] ?? null),
            'employmentType' => $employmentType,
            'educationRequirements' => $educationRequirements,
            'experienceRequirements' => $this->valueToString($jobPosting['experienceRequirements'] ?? null),
            'company' => [
                'name' => $companyName !== '' ? $companyName : null,
                'url' => isset($jobPosting['hiringOrganization']['sameAs']) ? (string) $jobPosting['hiringOrganization']['sameAs'] : null,
                'description' => $this->companyDescription($sections),
            ],
            'location' => $location,
            'publishedAt' => isset($jobPosting['datePosted']) ? (string) $jobPosting['datePosted'] : null,
            'validThrough' => isset($jobPosting['validThrough']) ? (string) $jobPosting['validThrough'] : null,
            'recruitment' => $this->recruitmentStepsFromText($html),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractJsonLdObject(DOMDocument $document, string $type): array
    {
        $xpath = new DOMXPath($document);
        $nodes = $xpath->query('//script[@type="application/ld+json"]');

        if (!$nodes instanceof \DOMNodeList) {
            return [];
        }

        foreach ($nodes as $node) {
            $json = json_decode($this->normalizeJsonPayload($node->textContent), true);
            foreach ($this->iterateJsonObjects($json) as $object) {
                if (($object['@type'] ?? null) === $type) {
                    return $object;
                }
            }
        }

        return [];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractAgentJson(DOMDocument $document): array
    {
        $xpath = new DOMXPath($document);
        $nodes = $xpath->query('//script[@id="AgentIaJsonOffre"]');

        if (!$nodes instanceof \DOMNodeList || $nodes->length === 0) {
            return [];
        }

        $json = json_decode($this->normalizeJsonPayload((string) $nodes->item(0)?->textContent), true);

        return is_array($json) ? $json : [];
    }

    /**
     * @param mixed $payload
     * @return array<int, array<string, mixed>>
     */
    private function iterateJsonObjects(mixed $payload): array
    {
        if (!is_array($payload)) {
            return [];
        }

        if (isset($payload['@type'])) {
            return [$payload];
        }

        $objects = [];
        foreach ($payload as $value) {
            if (is_array($value)) {
                $objects = array_merge($objects, $this->iterateJsonObjects($value));
            }
        }

        return $objects;
    }

    /**
     * @param array<string, mixed> $jobPosting
     * @return array<string, string|null>
     */
    private function extractLocation(array $jobPosting): array
    {
        $location = $jobPosting['jobLocation']['address'] ?? [];

        if (!is_array($location)) {
            return ['label' => null];
        }

        $street = $this->normalizeWhitespace((string) ($location['streetAddress'] ?? ''));
        $postalCode = $this->normalizeWhitespace((string) ($location['postalCode'] ?? ''));
        $city = $this->normalizeWhitespace((string) ($location['addressLocality'] ?? ''));
        $region = $this->normalizeWhitespace((string) ($location['addressRegion'] ?? ''));

        $labelParts = array_values(array_filter([
            $street,
            trim($postalCode.' '.$city),
            $region,
        ]));

        return [
            'label' => $labelParts === [] ? null : implode(' - ', $labelParts),
            'streetAddress' => $street !== '' ? $street : null,
            'postalCode' => $postalCode !== '' ? $postalCode : null,
            'city' => $city !== '' ? $city : null,
            'region' => $region !== '' ? $region : null,
            'country' => isset($location['addressCountry']) ? (string) $location['addressCountry'] : null,
        ];
    }

    private function extractSalary(array $jobPosting): ?string
    {
        $salary = $jobPosting['baseSalary']['value'] ?? null;
        if (!is_array($salary)) {
            return null;
        }

        $min = isset($salary['minValue']) ? (float) $salary['minValue'] : null;
        $max = isset($salary['maxValue']) ? (float) $salary['maxValue'] : null;
        $currency = isset($jobPosting['baseSalary']['currency']) ? (string) $jobPosting['baseSalary']['currency'] : 'EUR';
        $unit = isset($salary['unitText']) ? strtolower((string) $salary['unitText']) : 'month';

        if ($min === null && $max === null) {
            return null;
        }

        $range = $min !== null && $max !== null
            ? number_format($min, 2, ',', ' ').' - '.number_format($max, 2, ',', ' ')
            : number_format($min ?? $max ?? 0, 2, ',', ' ');

        return $range.' '.$this->currencySymbol($currency).' / '.$unit;
    }

    /**
     * @param array<int, mixed>|string|mixed $value
     * @return array<int, string>
     */
    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $value = [$value];
        }

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(function (mixed $item): string {
            if (is_array($item)) {
                $item = $item['credentialCategory'] ?? $item['name'] ?? '';
            }

            return $this->normalizeWhitespace((string) $item);
        }, $value)));
    }

    /**
     * @param array<string, mixed> $jobPosting
     * @return array<int, string>
     */
    private function extractEducationRequirements(array $jobPosting): array
    {
        $requirements = $jobPosting['educationRequirements'] ?? [];
        if (!is_array($requirements)) {
            $requirements = [$requirements];
        }

        return array_values(array_filter(array_map(static function (mixed $item): string {
            if (is_array($item)) {
                return trim((string) ($item['credentialCategory'] ?? $item['name'] ?? ''));
            }

            return trim((string) $item);
        }, $requirements)));
    }

    /**
     * @param array<int, array<string, string>> $sections
     */
    private function firstSectionBody(array $sections): ?string
    {
        if ($sections === []) {
            return null;
        }

        return $sections[0]['body'] ?: null;
    }

    /**
     * @param array<int, array<string, string>> $sections
     */
    private function companyDescription(array $sections): ?string
    {
        foreach ($sections as $section) {
            if (($section['title'] ?? '') === 'Bienvenue chez Laita') {
                return $section['body'] ?: null;
            }
        }

        return null;
    }

    /**
     * @return array<int, array{title: string, body: string}>
     */
    private function extractSectionsFromHtml(string $html): array
    {
        $html = trim($html);
        if ($html === '') {
            return [];
        }

        $previousUseErrors = libxml_use_internal_errors(true);
        $document = new DOMDocument();
        $document->loadHTML('<?xml encoding="UTF-8"><div id="root">'.$html.'</div>', LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        $xpath = new DOMXPath($document);
        $container = $xpath->query('//*[@id="root"]')->item(0);
        if (!$container instanceof DOMElement) {
            return [];
        }

        $sections = [];
        $currentTitle = null;
        $currentBody = [];

        foreach ($container->childNodes as $child) {
            if ($child instanceof \DOMElement && strtolower($child->nodeName) === 'h2') {
                if ($currentTitle !== null) {
                    $sections[] = [
                        'title' => $currentTitle,
                        'body' => $this->normalizeWhitespace(implode("\n", $currentBody)),
                    ];
                }

                $currentTitle = $this->normalizeWhitespace($child->textContent);
                $currentBody = [];
                continue;
            }

            $text = $this->normalizeWhitespace($this->extractNodeText($child));
            if ($text !== '') {
                $currentBody[] = $text;
            }
        }

        if ($currentTitle !== null) {
            $sections[] = [
                'title' => $currentTitle,
                'body' => $this->normalizeWhitespace(implode("\n", $currentBody)),
            ];
        }

        return array_values(array_filter($sections, static fn (array $section): bool => $section['title'] !== '' || $section['body'] !== ''));
    }

    private function extractNodeText(\DOMNode $node): string
    {
        $text = '';
        foreach ($node->childNodes as $child) {
            if ($child instanceof \DOMText) {
                $text .= $child->textContent;
                continue;
            }

            if ($child instanceof \DOMElement && in_array(strtolower($child->nodeName), ['br', 'p', 'li', 'ul'], true)) {
                $text .= "\n".$this->extractNodeText($child)."\n";
                continue;
            }

            $text .= $this->extractNodeText($child);
        }

        return $this->normalizeWhitespace(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private function recruitmentStepsFromText(string $html): ?string
    {
        if (preg_match('/<h2>Les étapes de recrutement<\/h2>(.*?)<h2>/is', $html, $matches)) {
            return $this->normalizeWhitespace(strip_tags(html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        }

        if (preg_match('/<h2>Les étapes de recrutement<\/h2>(.*)$/is', $html, $matches)) {
            return $this->normalizeWhitespace(strip_tags(html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        }

        return null;
    }

    private function stripHtmlToText(string $html): string
    {
        $previousUseErrors = libxml_use_internal_errors(true);
        $document = new DOMDocument();
        $document->loadHTML('<?xml encoding="UTF-8"><div id="root">'.$html.'</div>', LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        $xpath = new DOMXPath($document);
        $root = $xpath->query('//*[@id="root"]')->item(0);
        if (!$root instanceof \DOMNode) {
            return '';
        }

        return $this->normalizeWhitespace($this->extractNodeText($root));
    }

    private function normalizeJsonPayload(string $payload): string
    {
        $payload = trim($payload);
        if ($payload === '') {
            return '{}';
        }

        return html_entity_decode($payload, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function valueToString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            $value = reset($value);
        }

        $text = $this->normalizeWhitespace((string) $value);

        return $text === '' ? null : $text;
    }

    private function cleanText(string $value): string
    {
        return $this->normalizeWhitespace(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private function normalizeWhitespace(string $value): string
    {
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * @param array<int, string> $parts
     */
    private function joinParts(array $parts): ?string
    {
        $filtered = array_values(array_filter(array_map(fn (string $part): string => $this->cleanText($part), $parts)));

        return $filtered === [] ? null : implode(' - ', $filtered);
    }

    private function absoluteUrl(string $href): string
    {
        if ($href === '') {
            return self::URL;
        }

        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            return $href;
        }

        return 'https://www.hellowork.com'.$href;
    }

    private function currencySymbol(string $currency): string
    {
        return match (strtoupper($currency)) {
            'EUR' => '€',
            'USD' => '$',
            default => $currency,
        };
    }

    private function cacheFile(): string
    {
        return $this->projectDir.'/var/hellowork-offers.json';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readCache(): ?array
    {
        $file = $this->cacheFile();
        if (!is_file($file)) {
            return null;
        }

        $contents = @file_get_contents($file);
        if ($contents === false || $contents === '') {
            return null;
        }

        $decoded = json_decode($contents, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed>|null $cached
     * @return array<int, array<string, mixed>>|null
     */
    private function cachedOffers(?array $cached, int $limit): ?array
    {
        if (!is_array($cached) || ($cached['schemaVersion'] ?? null) !== self::CACHE_SCHEMA_VERSION || !isset($cached['offers']) || !is_array($cached['offers'])) {
            return null;
        }

        $offers = array_slice($cached['offers'], 0, $limit);
        if ($offers === []) {
            return null;
        }

        $firstOffer = $offers[0] ?? null;
        if (!is_array($firstOffer) || !array_key_exists('details', $firstOffer)) {
            return null;
        }

        return $offers;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function writeCache(array $payload): void
    {
        $file = $this->cacheFile();
        @file_put_contents($file, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}
