Gem::Specification.new do |s|
  s.name        = 'hydra_payments'
  s.version     = '0.1.0'
  s.summary     = 'Ruby SDK for the Hydra Payment Service API'
  s.description = 'Official Ruby SDK for Hydra Payments with HMAC-SHA256 request signing, typed API methods, and comprehensive error handling.'
  s.authors     = ['Hydra Payments']
  s.email       = ['dev@hydrapay.io']
  s.homepage    = 'https://github.com/hydra-pay/hydra'
  s.license     = 'MIT'

  s.files       = Dir['lib/**/*.rb'] + ['README.md']
  s.require_paths = ['lib']

  s.required_ruby_version = '>= 2.6'

  s.metadata['source_code_uri'] = 'https://github.com/hydra-pay/hydra/tree/main/sdks/ruby'
end
