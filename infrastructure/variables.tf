variable "aws_region" {
  description = "Región de AWS"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de despliegue (ej. staging, produccion)"
  type        = string
  default     = "staging"
}
