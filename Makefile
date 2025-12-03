all : up

hostname:
	@cd srcs && chmod +x generate_hostname.sh && ./generate_hostname.sh

certs : hostname
	@cd srcs && ./generate_certs.sh

up : certs
	@echo "\033[1;32mLancement en mode PRODUCTION...\033[0m"
	docker compose -f ./srcs/docker-compose.yml up --build

dev : certs
	@echo "\033[1;33mLancement en mode DÉVELOPPEMENT...\033[0m"
	docker compose -f ./srcs/docker-compose.dev.yml up

down :
	docker compose -f ./srcs/docker-compose.yml down
	docker compose -f ./srcs/docker-compose.dev.yml down

status : 
	@echo "\033[1;32mDOCKER:\033[0m"
	@docker ps
	@echo "\n\033[1;32mNETWORK:\033[0m"
	@docker network ls
	@echo "\n\033[1;32mIMAGES:\033[0m"
	@docker images

clear :
	@docker system prune -af --volumes

clean : down
	@cd srcs && rm -rf certs/*.pem
	@echo "Certificats supprimer"
	@docker ps -q | xargs -r docker stop
	@docker ps -a -q | xargs -r docker rm
	@docker images -q | xargs -r docker rmi
	@docker network prune -f

fclean: clean clear

re: fclean up

.PHONY: all hostname certs clean fclean re status dev
