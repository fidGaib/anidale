import UserService from "./service";
import { Login, Registration, UpdateUser } from "@/schema/resolvers-types";
import { Request, Response } from "express";
import { createGraphQLError } from "graphql-yoga";

const emailRegex =
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i;
class UserController {
  async registration(user: Registration, req: Request, res: Response) {
    const { email, pass, pass2 } = user;
    if (!email.trim() || !pass.trim() || !pass2.trim()) {
      throw createGraphQLError("У вас пустые поля");
    } else if (!email.match(emailRegex)) {
      throw createGraphQLError("Некорректный E-mail");
    } else if (pass !== pass2) {
      throw createGraphQLError("Пароли не совпадают");
    }
    const userData = await UserService.registration(email.trim(), pass.trim());

    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });
    res.cookie("accessToken", userData.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
    });
    return {
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      ...userData.user,
    };
  }
  async login(user: Login, req: Request, res: Response) {
    const { email, pass } = user;
    if (!email.trim() || !pass.trim()) {
      throw createGraphQLError("У вас пустые поля");
    } else if (!email.match(emailRegex)) {
      throw createGraphQLError("Некорректный E-mail");
    }
    const userData = await UserService.login(email.trim(), pass.trim());
    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });
    res.cookie("accessToken", userData.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
    });
    return {
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      ...userData.user,
    };
  }
  async fetchOne(id: number) {
    return await UserService.getUser(id);
  }
  async fetchMany() {
    return await UserService.getUsers();
  }
  async updateUser(id: number, user?: UpdateUser) {
    if (!user) throw Error("User not found");
    if (user.email && !user.email.match(emailRegex)) {
      throw createGraphQLError("Некорректный E-mail");
    }

    return await UserService.update(id, user);
  }
  async remove(id: number) {
    return await UserService.remove(id);
  }
  async logout(req: Request) {
    return await UserService.logout(req.cookies.refreshToken);
  }
  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.cookies;
    const user = await UserService.refresh(refreshToken);
    res.cookie("refreshToken", user.refreshToken, {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });
    res.cookie("accessToken", user.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
    });
    return user;
  }
}
export default new UserController();
