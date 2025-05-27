all : up

back :
	docker compose -f ./srcs/docker-compose.yml up back

front :
	docker compose -f ./srcs/docker-compose.yml up front

up :
	docker compose -f ./srcs/docker-compose.yml up --build

down :
	docker compose -f ./srcs/docker-compose.yml down

re: fclean up

status : 
	@echo "\033[1;32mDOCKER:\033[0m"
	@docker ps
	@echo "\n\033[1;32mNETWORK:\033[0m"
	@docker network ls
	@echo "\n\033[1;32mIMAGES:\033[0m"
	@docker images

clear :
	@docker system prune -af --volumes

clean :
	@docker ps -q | xargs -r docker stop
	@docker ps -a -q | xargs -r docker rm
	@docker images -q | xargs -r docker rmi
	@docker network prune -f

fclean: clean clear

.PHONY: all clean fclean re status