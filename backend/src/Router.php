<?php

declare(strict_types=1);

final class Router
{
    /**
     * @var array<int, array{method:string, path:string, handler:callable}>
     */
    private array $routes = [];

    public function add(string $method, string $path, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler,
        ];
    }

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function patch(string $path, callable $handler): void
    {
        $this->add('PATCH', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    public function options(string $path, callable $handler): void
    {
        $this->add('OPTIONS', $path, $handler);
    }

    public function dispatch(string $method, string $path): mixed
    {
        $normalizedPath = rtrim($path, '/');
        $normalizedPath = $normalizedPath === '' ? '/' : $normalizedPath;

        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) {
                continue;
            }

            $pattern = $this->compileRoutePattern($route['path']);
            if (preg_match($pattern, $normalizedPath, $matches) !== 1) {
                continue;
            }

            $params = [];
            preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $route['path'], $paramNames);
            foreach ($paramNames[1] as $index => $name) {
                $params[$name] = $matches[$index + 1] ?? null;
            }

            $result = ($route['handler'])(...array_values($params));

            if (is_array($result)) {
                if (array_key_exists('success', $result) && is_bool($result['success'])) {
                    Response::json($result, 200);
                }

                Response::success($result, 'Operation completed successfully');
            }

            if (is_string($result)) {
                echo $result;
                return null;
            }

            return $result;
        }

        Response::error('Endpoint not found.', 404);
    }

    private function compileRoutePattern(string $routePath): string
    {
        $escaped = preg_quote($routePath, '#');
        $escaped = preg_replace('/\\\{([a-zA-Z_][a-zA-Z0-9_]*)\\\}/', '([^/]+)', $escaped);

        return '#^' . $escaped . '$#';
    }
}
